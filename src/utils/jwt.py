import os
import uuid
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from pydantic import ValidationError
from typing import Annotated, List, Optional

from fastapi import Header, HTTPException, status, Depends, Request, Response
from jose import jwt, JWTError

from src.schemas.auth import TokenDict, UserRole


load_dotenv()


SECRET_KEY = os.getenv("JWT_SECRET", "order-chat")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30
ALLOW_ROLE: List[UserRole] = [UserRole.ADMIN]
ANON_COOKIE_NAME = "chat_anon_id"


def create_access_token(data: TokenDict, expires_delta: timedelta | None = None):
    to_encode = data.model_dump(mode="json")
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": int(expire.timestamp())})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_current_user(authorization: Annotated[str, Header()] = None) -> TokenDict:
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


async def get_current_admin(current_user: Annotated[TokenDict, Depends(get_current_user)]) -> TokenDict:
    if current_user.role not in ALLOW_ROLE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied. Required roles: {ALLOW_ROLE}")
    return current_user


async def get_chat_user(
        request: Request,
        response: Response,
        authorization: Annotated[str, Header()] = None
) -> str:
    """
    获取当前请求的用户标识字符串：
    - 已登录：user_{user_id}
    - 未登录：anon_{cookie_uuid}
    """
    # 1. 尝试解析登录 Token（复用原 get_chat_user 逻辑）
    token_dict: Optional[TokenDict] = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        payload = verify_access_token(token)
        if payload:
            try:
                token_dict = TokenDict(**payload)
            except ValidationError:
                pass  # token 无效，视作未登录

    # 2. 如果登录成功，返回登录用户标识
    if token_dict:
        return f"user_{token_dict.id}"

    # 3. 匿名用户：从 Cookie 读取或生成新标识
    anon_id = request.cookies.get(ANON_COOKIE_NAME)
    if not anon_id:
        anon_id = str(uuid.uuid4())
        response.set_cookie(
            key=ANON_COOKIE_NAME,
            value=anon_id,
            max_age=60 * 60 * 24 * 365,  # 1 年
            httponly=True,
            samesite="lax"
        )
    return f"anon_{anon_id}"


async def get_anon_identifier_from_cookie(request: Request) -> str | None:
    anon_id = request.cookies.get(ANON_COOKIE_NAME)
    if anon_id:
        return f"anon_{anon_id}"
    return None