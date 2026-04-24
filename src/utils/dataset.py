import json
from fastapi import HTTPException
from typing import Any, Dict, List, Optional
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue, MatchAny, Range, MatchText, PayloadSchemaType

from src.schemas.dataset import FilterCondition


async def check_dataset(client: AsyncQdrantClient, name: str):
    exist = await client.collection_exists(name)
    if not exist:
        raise HTTPException(status_code=400, detail=f"知识库 {name} 不存在")


def check_field_type(value: Any, expected_type: str) -> bool:
    if expected_type == "string":
        return isinstance(value, str)
    elif expected_type == "number":
        return isinstance(value, (int, float))
    elif expected_type == "boolean":
        return isinstance(value, bool)
    elif expected_type == "array":
        return isinstance(value, list)
    elif expected_type == "object":
        return isinstance(value, dict)
    return False


async def validate_and_fill_metadata(
        collection_name: str,
        metadata: List[Dict[str, Any]],
        pool
):
    """
    根据 collection_fields 表的定义校验 metadata 字段，
    并补全缺失的默认值。
    """
    async with pool.connection() as conn:
        cur = await conn.execute(
            """
            SELECT field_name, field_type, is_required, default_value
            FROM collection_fields
            WHERE collection_name = %s
              AND deleted_at IS NULL
            """,
            (collection_name,)
        )
        rows = await cur.fetchall()

        fields = {}
        for row in rows:
            fields[row["field_name"]] = {
                "type": row["field_type"],
                "required": row["is_required"],
                "default": json.loads(row["default_value"]) if row["default_value"] else None
            }

        validated_list = []
        for item in metadata:
            validated = {}
            # 检查传入字段是否在 Schema 中
            for key, value in item.items():
                if key not in fields:
                    raise HTTPException(status_code=400, detail=f"Field '{key}' is not defined in collection schema")

                # 简单类型校验（可按需扩展）
                if not check_field_type(value, fields[key]["type"]):
                    raise HTTPException(
                        status_code=400,
                        detail=f"Field '{key}' expects type {fields[key]['type']}"
                    )
                validated[key] = value

            # 补全必填字段或默认值
            for field_name, field_def in fields.items():
                if field_name not in validated:
                    if field_def["required"]:
                        raise HTTPException(status_code=400, detail=f"Missing required field: {field_name}")
                    elif field_def["default"] is not None:
                        validated[field_name] = field_def["default"]

            validated_list.append(validated)

        return validated_list


def build_qdrant_filter(conditions: List[FilterCondition]) -> Optional[Filter]:
    if not conditions:
        return None

    must = []
    must_not = []

    for cond in conditions:
        field_key = cond.field
        op = cond.operator
        val = cond.value

        if op == "eq":
            must.append(FieldCondition(key=field_key, match=MatchValue(value=val)))
        elif op == "ne":
            must_not.append(FieldCondition(key=field_key, match=MatchValue(value=val)))
        elif op in ("gt", "gte", "lt", "lte"):
            range_params = {op: val}
            must.append(FieldCondition(key=field_key, range=Range(**range_params)))
        elif op == "in":
            must.append(FieldCondition(key=field_key, match=MatchAny(any=val)))
        elif op == "nin":
            must_not.append(FieldCondition(key=field_key, match=MatchAny(any=val)))
        elif op == "like":
            # 注意：需要 collection 中对 field_key 开启全文索引，否则此处可能报错
            must.append(FieldCondition(key=field_key, match=MatchText(text=str(val))))
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported operator: {op}")

    return Filter(must=must, must_not=must_not)


async def get_qdrant_index_params(
    field_type: str
):
    """
    根据业务字段类型返回对应的 Qdrant 索引参数。
    可根据实际需求调整默认行为。
    """
    if field_type == "string":
        # 默认为字符串字段创建 Keyword 索引（精确匹配）
        return PayloadSchemaType.KEYWORD
        # 如果需要全文搜索，可改为 TextIndexParams
        # return qdrant_models.TextIndexParams(tokenizer="word", min_token_len=2)

    elif field_type == "number":
        # 统一使用 FloatIndex，兼容整数与浮点数
        return PayloadSchemaType.FLOAT

    elif field_type == "boolean":
        return PayloadSchemaType.BOOL

    elif field_type == "array":
        # 数组无法直接建索引，通常需要对数组内元素字段建索引
        # 这里简单处理：不自动创建，由调用方在定义中额外指定内部字段
        return None

    else:
        # object 或未知类型不创建索引
        return None