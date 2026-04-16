import json
from fastapi import HTTPException
from typing import Any, Dict, List, Optional
from qdrant_client.models import Filter, FieldCondition, MatchValue, MatchAny, Range

from src.database.postgre import get_db_pool
from src.schemas.dataset import FilterCondition


def check_field_type(value: Any, expected_type: str) -> bool:
    if expected_type == "string":
        return isinstance(value, str)
    elif expected_type == "integer":
        return isinstance(value, int)
    elif expected_type == "float":
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
        metadata: List[Dict[str, Any]]
):
    """
    根据 collection_fields 表的定义校验 metadata 字段，
    并补全缺失的默认值。
    """
    pool = await get_db_pool()
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
    """将自定义条件列表转换为 Qdrant Filter 对象"""
    if not conditions:
        return None

    must_conditions = []
    for cond in conditions:
        field_key = cond.field
        op = cond.operator
        val = cond.value

        if op == "eq":
            must_conditions.append(FieldCondition(key=field_key, match=MatchValue(value=val)))
        elif op == "ne":
            # Qdrant 不直接支持 ne，可通过 must_not 实现，此处简化为暂不支持或转成其他方式
            # 这里为了演示，我们抛出不支持异常
            raise HTTPException(status_code=400, detail="Operator 'ne' not yet supported")
        elif op in ("gt", "gte", "lt", "lte"):
            range_params = {op: val}
            must_conditions.append(FieldCondition(key=field_key, range=Range(**range_params)))
        elif op == "in":
            must_conditions.append(FieldCondition(key=field_key, match=MatchAny(any=val)))
        elif op == "nin":
            # 类似 ne，暂不支持
            raise HTTPException(status_code=400, detail="Operator 'nin' not yet supported")
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported operator: {op}")

    return Filter(must=must_conditions)