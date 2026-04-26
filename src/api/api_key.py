import json
from fastapi import APIRouter, Depends, HTTPException, Path, Body
from typing import List, Annotated
from uuid import UUID

from src.database.postgre import get_db_pool
from src.schemas.api_key import ApiKeyItem, ApiKeyCreatedResponse, CreateApiKeyRequest, DeleteApiKeyRequest, ToggleApiKeyRequest, ApiKeyPageParams
from src.schemas.auth import TokenDict
from src.schemas.page import DataResult, PageResult
from src.utils.auth import get_current_admin
from src.utils.security import generate_api_key, encrypt_api_key, decrypt_api_key


api_key_router = APIRouter(
    prefix="/api_key",
    tags=["API Key 管理"],
    dependencies=[Depends(get_current_admin)]
)


# ---------- 创建密钥 ----------
@api_key_router.post(
    path="",
    response_model=DataResult[ApiKeyCreatedResponse],
    summary="创建 API 密钥",
    description="生成一个新的 API 密钥，返回仅显示一次的明文密钥。支持设置名称、权限、速率限制、过期时间和描述。",
)
async def create_api_key(
    req: Annotated[CreateApiKeyRequest, Body(description="密钥创建参数")],
    current_user: Annotated[TokenDict, Depends(get_current_admin)],
    pool=Depends(get_db_pool),
):
    plain_key, key_hash, prefix = generate_api_key()
    key_encrypted = encrypt_api_key(plain_key)

    async with pool.connection() as conn:
        cur = await conn.execute(
            """
            INSERT INTO api_keys (user_id, name, key_hash, prefix, key_encrypted, permissions, rate_limit, expires_at, description)
            VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s)
            RETURNING id, created_at
            """,
            (
                int(current_user.id),
                req.name,
                key_hash,
                prefix,
                key_encrypted,
                json.dumps(req.permissions),
                req.rate_limit,
                req.expires_at,
                req.description,
            ),
        )
        row = await cur.fetchone()

    return DataResult(
        status=1,
        data={
            "id": row["id"],
            "name": req.name,
            "key": plain_key,
            "prefix": prefix,
            "created_at": row["created_at"],
        },
    )

# ---------- 密钥列表 ----------
@api_key_router.get(
    path="",
    response_model=PageResult[ApiKeyItem],
    summary="查询 API 密钥列表",
    description="分页获取 API 密钥列表。支持按名称或描述模糊搜索，支持排序和分页。",
)
async def list_api_keys(
    params: Annotated[ApiKeyPageParams, Depends()],
    pool=Depends(get_db_pool),
):
    select_sql = """
    SELECT ak.id, ak.name, ak.key_hash, ak.prefix, ak.key_encrypted, ak.permissions, ak.rate_limit,
           ak.created_at, ak.last_used_at, ak.expires_at, ak.is_active, ak.description
    FROM api_keys ak
    """

    where_clauses = []
    query_params = []

    if params.keyword:
        where_clauses.append("(ak.name ILIKE %s OR ak.description ILIKE %s)")
        query_params.extend([f"%{params.keyword}%", f"%{params.keyword}%"])

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    order_sql = f"ORDER BY ak.{params.order_by} {params.direction.upper()}"

    limit = params.size
    offset = params.offset
    pagination_sql = "LIMIT %s OFFSET %s"
    query_params.extend([limit, offset])

    count_sql = f"SELECT COUNT(*) FROM api_keys ak {where_sql}"
    data_sql = f"{select_sql} {where_sql} {order_sql} {pagination_sql}"

    async with pool.connection() as conn:
        cur = await conn.execute(count_sql, query_params[:-2])
        total_row = await cur.fetchone()
        total = total_row["count"] if isinstance(total_row, dict) else total_row[0]

        cur = await conn.execute(data_sql, query_params)
        rows = await cur.fetchall()

    items = []
    for row in rows:
        plain_key = decrypt_api_key(row["key_encrypted"]) if row["key_encrypted"] else ""
        items.append(
            ApiKeyItem(
                id=row["id"],
                name=row["name"],
                key=plain_key,
                prefix=row["prefix"],
                permissions=row["permissions"] or [],
                rate_limit=row["rate_limit"],
                created_at=row["created_at"],
                last_used_at=row["last_used_at"],
                expires_at=row["expires_at"],
                is_active=row["is_active"],
                description=row["description"],
            )
        )

    return PageResult(
        total=total,
        data=items,
        page=params.page,
        size=params.size,
    )

# ---------- 密钥总数 ----------
@api_key_router.get(
    path="/count",
    response_model=DataResult[int],
    summary="获取密钥总数",
    description="返回当前系统中 API 密钥的总数量。",
)
async def api_key_count(pool=Depends(get_db_pool)):
    async with pool.connection() as conn:
        cur = await conn.execute("SELECT COUNT(*) FROM api_keys")
        row = await cur.fetchone()
        count = row.get("count") if isinstance(row, dict) else row[0]
    return DataResult(status=1, data=count)

# ---------- 删除密钥 ----------
@api_key_router.delete(
    path="/delete",
    response_model=DataResult[List[str]],
    summary="批量删除 API 密钥",
    description="根据提供的 ID 列表批量删除密钥，删除后不可恢复。",
)
async def revoke_api_key(
    req: Annotated[DeleteApiKeyRequest, Body(description="要删除的密钥 ID 列表")],
    pool=Depends(get_db_pool),
):
    async with pool.connection() as conn:
        cur = await conn.execute(
            """
            DELETE FROM api_keys
            WHERE id = ANY (%s)
            RETURNING id
            """,
            (req.ids,),
        )
        rows = await cur.fetchall()
        deleted_ids = [
            str(row.get("id")) if isinstance(row, dict) else str(row[0])
            for row in rows
        ]

        if not deleted_ids:
            raise HTTPException(status_code=404, detail="No API keys found to delete")

    return DataResult(status=1, data=deleted_ids, msg="API key revoked")

# ---------- 切换启用状态 ----------
@api_key_router.patch(
    path="/{key_id}/toggle",
    response_model=DataResult[bool],
    summary="切换密钥启用状态",
    description="启用或禁用指定的 API 密钥。",
)
async def toggle_api_key(
    key_id: Annotated[UUID, Path(description="要操作的密钥 UUID")],
    req: Annotated[ToggleApiKeyRequest, Body(description="是否启用")],
    pool=Depends(get_db_pool),
):
    async with pool.connection() as conn:
        cur = await conn.execute(
            """
            UPDATE api_keys
            SET is_active = %s
            WHERE id = %s
            RETURNING id
            """,
            (req.is_active, key_id),
        )
        updated = await cur.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="API key not found")
    return DataResult(
        status=1,
        data=req.is_active,
        msg=f"API key {'enabled' if req.is_active else 'disabled'}",
    )