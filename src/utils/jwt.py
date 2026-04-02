import os
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
from pydantic import ValidationError
from typing import Annotated, List

from fastapi import Header, HTTPException, status, Depends
from jose import jwt, JWTError

from src.schemas.auth import TokenDict, UserRole


load_dotenv()


SECRET_KEY = os.getenv("JWT_SECRET", "order-chat")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30
ALLOW_ROLE: List[UserRole] = [UserRole.ADMIN]


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


async def get_chat_user(authorization: Annotated[str, Header()] = None) -> TokenDict | None:
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