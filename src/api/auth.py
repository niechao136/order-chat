from typing import Annotated, Optional
from fastapi import APIRouter, Depends, Body

from src.database.postgre import get_db_pool
from src.schemas.auth import UserRegister, UserLogin, TokenDict
from src.schemas.page import DataResult
from src.utils.auth import get_anon_identifier
from src.utils.jwt import create_access_token
from src.utils.chat import merge_anonymous_conversations_to_user
from src.utils.security import pwd_context

auth_router = APIRouter(
    prefix="/auth",
    tags=["Auth 模块"]
)

@auth_router.post(
    path="/register",
    response_model=DataResult[str],
    summary="用户注册",
    description="创建新用户账号，成功后返回 JWT Token。如果当前浏览器存在匿名会话，会自动合并至新账号。",
)
async def register(
    user: Annotated[UserRegister, Body(description="用户注册表单")],
    pool=Depends(get_db_pool),
    anon_identifier: Annotated[Optional[str], Depends(get_anon_identifier)] = None,
):
    hash_pwd = pwd_context.hash(user.password)
    async with pool.connection() as conn:
        async with conn.transaction():
            cur = await conn.execute("SELECT 1 FROM users WHERE username = %s", (user.username,))
            exists = await cur.fetchone()
            if exists:
                return DataResult(status=0, msg="Username already exists")

            cur = await conn.execute(
                """
                INSERT INTO users (username, email, password, role)
                VALUES (%s, %s, %s, %s) RETURNING id
                """, (user.username, user.email, hash_pwd, user.role)
            )
            row = await cur.fetchone()
            user_id = str(row["id"])
            user_identifier = f"user_{user_id}"
            if anon_identifier:
                await merge_anonymous_conversations_to_user(conn, user_identifier, anon_identifier)

            token = create_access_token(TokenDict(id=user_id, name=user.username, role=user.role))
            return DataResult(status=1, data=token)

@auth_router.post(
    path="/login",
    response_model=DataResult[str],
    summary="用户登录",
    description="验证用户名和密码，成功后返回 JWT Token。如果当前浏览器存在匿名会话，会自动合并至登录账号。",
)
async def login(
    user: Annotated[UserLogin, Body(description="用户登录凭证")],
    pool=Depends(get_db_pool),
    anon_identifier: Annotated[Optional[str], Depends(get_anon_identifier)] = None,
):
    async with pool.connection() as conn:
        async with conn.transaction():
            cur = await conn.execute(
                "SELECT id, username, password, role FROM users WHERE username = %s",
                (user.username,)
            )
            row = await cur.fetchone()
            if not row or not pwd_context.verify(user.password, row["password"]):
                return DataResult(status=0, msg="Username or password is incorrect")

            user_id = str(row["id"])
            user_identifier = f"user_{user_id}"
            if anon_identifier:
                await merge_anonymous_conversations_to_user(conn, user_identifier, anon_identifier)

            token = create_access_token(TokenDict(id=user_id, name=user.username, role=row["role"]))
            return DataResult(status=1, data=token)