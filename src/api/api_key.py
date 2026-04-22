import json
from fastapi import APIRouter, Depends, HTTPException
from uuid import UUID

from src.database.postgre import get_db_pool
from src.schemas.api_key import ApiKeyItem, ApiKeyCreatedResponse, CreateApiKeyRequest, ToggleApiKeyRequest
from src.schemas.auth import TokenDict
from src.schemas.page import NoPageResult, DataResult
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
            int(current_user["id"]),
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

# ---------- 列出所有密钥 ----------
@api_key_router.get("", response_model=NoPageResult[ApiKeyItem])
async def list_api_keys(
    _: TokenDict = Depends(get_current_admin),
    pool = Depends(get_db_pool)
):
    async with pool.connection() as conn:
        cur = await conn.execute("""
        SELECT ak.id, ak.name, ak.key_hash, ak.prefix, ak.permissions, ak.rate_limit, ak.created_at,
               ak.last_used_at, ak.expires_at, ak.is_active, ak.description
        FROM api_keys ak
        ORDER BY ak.created_at DESC
        """)
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

    return NoPageResult(total=len(items), data=items)

# ---------- 删除密钥 ----------
@api_key_router.delete("/{key_id}", response_model=DataResult[str])
async def revoke_api_key(
    key_id: UUID,
    _: TokenDict = Depends(get_current_admin),
    pool = Depends(get_db_pool)
):
    async with pool.connection() as conn:
        cur = await conn.execute("""
            DELETE FROM api_keys
            WHERE id = %s
            RETURNING id
        """, (key_id,))
        deleted = await cur.fetchone()
        if not deleted:
            raise HTTPException(status_code=404, detail="API key not found")
    return DataResult(status=1, msg="API key revoked")

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