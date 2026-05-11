import asyncio
import json
from datetime import datetime, timezone
from fastapi import Request, HTTPException, status, WebSocket
from uuid import UUID

from src.schemas.auth import ApiKeyEntry
from src.utils.security import verify_api_key


def hand_id(obj):
    d = dict(obj)
    d["id"] = str(d["id"])
    return d


async def update_usage(
        key_id: UUID,
        request: Request | WebSocket,
        pool
):
    endpoint = request.url.path
    client = request.client if request.client else None
    ip_address = client.host if client else "unknown"
    user_agent = request.headers.get("User-Agent", "")
    try:
        async with pool.connection() as conn:
            await conn.execute(
                "UPDATE api_keys SET last_used_at = NOW() WHERE id = %s",
                (key_id,)
            )
            await conn.execute(
                """
                INSERT INTO api_key_usage (key_id, endpoint, ip_address, user_agent, response_status)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (key_id, endpoint, ip_address, user_agent, 200)
            )
    except Exception:
        pass


async def get_api_key(
        request: Request | WebSocket,
        pool
) -> ApiKeyEntry:

    api_key = request.headers.get("X-API-Key")
    if not api_key:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            api_key = auth_header[7:]

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required"
        )

    # 提取前缀（假设密钥长度 >= 8）
    prefix = api_key[:8] if len(api_key) >= 8 else ""

    async with pool.connection() as conn:
        if prefix:
            cur = await conn.execute(
                """
                SELECT id, user_id, key_hash, permissions, rate_limit, is_active, expires_at 
                FROM api_keys WHERE prefix = %s
                """,
                (prefix,)
            )
        else:
            cur = await conn.execute(
                """
                SELECT id, user_id, key_hash, permissions, rate_limit, is_active, expires_at
                FROM api_keys
                """)
        rows = await cur.fetchall()

    valid_row: dict | None = None
    for row in rows:
        if verify_api_key(api_key, row["key_hash"]):
            valid_row = row
            break

    if not valid_row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key"
        )

    if not valid_row["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API key inactive"
        )
    if valid_row["expires_at"] and valid_row["expires_at"] < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API key expired"
        )

    asyncio.create_task(update_usage(key_id=valid_row["id"], request=request, pool=pool))

    permissions = valid_row["permissions"] or []
    if isinstance(permissions, str):
        permissions = json.loads(permissions)

    return ApiKeyEntry(
        key_id=str(valid_row["id"]),
        user_id=valid_row["user_id"],
        permissions=permissions,
        rate_limit=valid_row["rate_limit"]
    )
