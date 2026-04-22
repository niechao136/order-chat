import json
from fastapi import APIRouter, Depends, HTTPException
from typing import List
from uuid import UUID

from src.database.postgre import get_db_pool
from src.schemas.api_key import ApiKeyItem, ApiKeyCreatedResponse, CreateApiKeyRequest, DeleteApiKeyRequest, ToggleApiKeyRequest, ApiKeyPageParams
from src.schemas.auth import TokenDict
from src.schemas.page import DataResult, PageResult
from src.utils.jwt import get_current_admin
from src.utils.security import generate_api_key


api_key_router = APIRouter(prefix="/api_key", tags=["API Key"])


# ---------- 创建密钥 ----------
@api_key_router.post("", response_model=DataResult[ApiKeyCreatedResponse])
async def create_api_key(
    req: CreateApiKeyRequest,
    current_user: TokenDict = Depends(get_current_admin),
    pool = Depends(get_db_pool)
):
    """创建新的 API 密钥（返回一次明文密钥）"""
    plain_key, key_hash, prefix = generate_api_key()

    async with pool.connection() as conn:
        cur = await conn.execute("""
            INSERT INTO api_keys (user_id, name, key_hash, prefix, permissions, rate_limit, expires_at, description)
            VALUES (%s, %s, %s, %s, %s::jsonb, %s, %s, %s)
            RETURNING id, created_at
        """, (
            int(current_user.id),
            req.name,
            key_hash,
            prefix,
            json.dumps(req.permissions),
            req.rate_limit,
            req.expires_at,
            req.description
        ))
        row = await cur.fetchone()

    return DataResult(status=1, data={
        "id": row["id"],
        "name": req.name,
        "key": plain_key,
        "prefix": prefix,
        "created_at": row["created_at"]
    })

# ---------- 密钥列表 ----------
@api_key_router.get("", response_model=PageResult[ApiKeyItem])
async def list_api_keys(
    params: ApiKeyPageParams = Depends(),
    _: TokenDict = Depends(get_current_admin),
    pool = Depends(get_db_pool)
):
    # 基础查询语句（SELECT 部分）
    select_sql = """
    SELECT ak.id, ak.name, ak.key_hash, ak.prefix, ak.permissions, ak.rate_limit, ak.created_at,
           ak.last_used_at, ak.expires_at, ak.is_active, ak.description
    FROM api_keys ak
    """

    # 构建 WHERE 条件（搜索）
    where_clauses = []
    query_params = []

    if params.keyword:
        # 在名称和描述中模糊搜索
        where_clauses.append("(ak.name ILIKE %s OR ak.description ILIKE %s)")
        query_params.extend([f"%{params.keyword}%", f"%{params.keyword}%"])

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    # 排序
    order_sql = f"ORDER BY ak.{params.order_by} {params.direction.upper()}"

    # 分页
    limit = params.size
    offset = params.offset
    pagination_sql = "LIMIT %s OFFSET %s"
    query_params.extend([limit, offset])

    # 组合查询总数 SQL
    count_sql = f"SELECT COUNT(*) FROM api_keys ak {where_sql}"

    # 组合查询数据 SQL
    data_sql = f"{select_sql} {where_sql} {order_sql} {pagination_sql}"
    async with pool.connection() as conn:
        # 1. 获取总数
        cur = await conn.execute(count_sql, query_params[:-2])  # 去掉 LIMIT/OFFSET 参数
        total_row = await cur.fetchone()
        total = total_row["count"] if isinstance(total_row, dict) else total_row[0]

        # 2. 获取当前页数据
        cur = await conn.execute(data_sql, query_params)
        rows = await cur.fetchall()

    items = []
    for row in rows:
        items.append(ApiKeyItem(
            id=row["id"],
            name=row["name"],
            key=row["key_hash"],
            prefix=row["prefix"],
            permissions=row["permissions"] or [],
            rate_limit=row["rate_limit"],
            created_at=row["created_at"],
            last_used_at=row["last_used_at"],
            expires_at=row["expires_at"],
            is_active=row["is_active"],
            description=row["description"]
        ))

    return PageResult(
        total=total,
        data=items,
        page=params.page,
        size=params.size
    )

# ---------- 密钥总数 ----------
@api_key_router.get("/count", response_model=DataResult[int])
async def api_key_count(
        _: TokenDict = Depends(get_current_admin),
        pool=Depends(get_db_pool)
):
    async with pool.connection() as conn:
        cur = await conn.execute("SELECT COUNT(*) FROM api_keys")
        row = await cur.fetchone()
        count = row.get("count") if isinstance(row, dict) else row[0]

    return DataResult(status=1, data=count)

# ---------- 删除密钥 ----------
@api_key_router.delete("/delete", response_model=DataResult[List[str]])
async def revoke_api_key(
    req: DeleteApiKeyRequest,
    _: TokenDict = Depends(get_current_admin),
    pool = Depends(get_db_pool)
):
    async with pool.connection() as conn:
        cur = await conn.execute("""
            DELETE FROM api_keys
            WHERE id = ANY (%s)
            RETURNING id
        """, (req.ids,))
        rows = await cur.fetchall()
        deleted_ids = [str(row.get("id")) if isinstance(row, dict) else str(row[0]) for row in rows]

        if not deleted_ids:
            raise HTTPException(status_code=404, detail="No API keys found to delete")

    return DataResult(status=1, data=deleted_ids, msg="API key revoked")

# ---------- 切换启用状态 ----------
@api_key_router.patch("/{key_id}/toggle", response_model=DataResult[bool])
async def toggle_api_key(
    key_id: UUID,
    req: ToggleApiKeyRequest,
    _: TokenDict = Depends(get_current_admin),
    pool = Depends(get_db_pool)
):
    async with pool.connection() as conn:
        cur = await conn.execute("""
            UPDATE api_keys
            SET is_active = %s
            WHERE id = %s
            RETURNING id
        """, (req.is_active, key_id))
        updated = await cur.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="API key not found")
    return DataResult(status=1, data=req.is_active, msg=f"API key {'enabled' if req.is_active else 'disabled'}")