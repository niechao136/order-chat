import uuid
from fastapi import Request, Response, HTTPException, Depends, Header, status, WebSocket
from pydantic import ValidationError
from typing import Annotated, Optional, List

from src.database.postgre import get_db_pool
from src.schemas.auth import TokenDict, UserRole
from src.utils.api import get_api_key
from src.utils.jwt import verify_access_token


ALLOW_ROLE: List[UserRole] = [UserRole.ADMIN]
ANON_COOKIE_NAME = "chat_anon_id"
ALLOWED_ORIGIN = [
    "https://niechao.duckdns.org",
    "http://150.109.15.178:10092",
    "http://localhost:3000"
]


async def get_current_user(
        authorization: Annotated[str, Header()] = None
) -> TokenDict:
    """
    从请求头 Authorization: Bearer <token> 获取当前用户
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
            headers={"WWW-Authenticate": "Bearer"})

    token = authorization[7:]
    payload = verify_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalid or expired")

    try:
        return TokenDict(**payload)
    except ValidationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token data corrupted"
        )


async def get_current_admin(
        current_user: Annotated[TokenDict, Depends(get_current_user)]
) -> TokenDict:
    if current_user.role not in ALLOW_ROLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied. Required roles: {ALLOW_ROLE}")
    return current_user


async def get_optional_current_user(
        authorization: Annotated[str, Header()] = None
):
    """
    从请求头 Authorization: Bearer <token> 获取当前用户
    """
    if not authorization or not authorization.startswith("Bearer "):
        return None

    token = authorization[7:]
    payload = verify_access_token(token)

    if not payload:
        return None

    try:
        return TokenDict(**payload)
    except ValidationError:
        return None


async def get_admin_entity(
    request: Request,
    token: Optional[TokenDict] = Depends(get_optional_current_user),
    pool = Depends(get_db_pool)
) -> bool:
    # 1. JWT 优先
    if token:
        if token.role not in ALLOW_ROLE:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied. Required roles: {ALLOW_ROLE}")
        return True

    # 2. 尝试 API Key
    try:
        _ = await get_api_key(request, pool)
        return True
    except HTTPException:
        pass

    return False


async def get_chat_entity(
        request: Request,
        response: Response,
        token: Optional[TokenDict] = Depends(get_optional_current_user),
        pool=Depends(get_db_pool)
) -> str:
    # 1. JWT 优先
    if token:
        return f"user_{token.id}"

    try:
        key_info = await get_api_key(request, pool)
        return f"api_key_{key_info.key_id}"
    except HTTPException:
        pass

    origin = request.headers.get("origin") or request.headers.get("referer")

    is_allowed = any(origin and origin.startswith(net) for net in ALLOWED_ORIGIN)

    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Need token or API key"
        )

    anon_id = request.cookies.get(ANON_COOKIE_NAME)
    if not anon_id:
        anon_id = uuid.uuid4().__str__()
        response.set_cookie(
            key=ANON_COOKIE_NAME,
            value=anon_id,
            max_age=60 * 60 * 24 * 365,  # 1 年
            httponly=True,
            samesite="lax"
        )
    return f"anon_{anon_id}"


async def get_chat_websocket(
        websocket: WebSocket,
        pool=Depends(get_db_pool)
) -> str:
    # 1. JWT 优先
    authorization = websocket.headers.get("Authorization")
    token = await get_optional_current_user(authorization)
    if token:
        return f"user_{token.id}"

    try:
        key_info = await get_api_key(websocket, pool)
        return f"api_key_{key_info.key_id}"
    except HTTPException:
        pass

    origin = websocket.headers.get("origin") or websocket.headers.get("referer")

    is_allowed = any(origin and origin.startswith(net) for net in ALLOWED_ORIGIN)

    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Need token or API key"
        )

    anon_id = websocket.cookies.get(ANON_COOKIE_NAME)
    if not anon_id:
        anon_id = uuid.uuid4().__str__()

    return f"anon_{anon_id}"


async def get_anon_identifier(request: Request) -> str | None:
    anon_id = request.cookies.get(ANON_COOKIE_NAME)
    if anon_id:
        return f"anon_{anon_id}"
    return None
