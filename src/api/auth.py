from fastapi import APIRouter, Depends

from src.database.postgre import get_db_pool
from src.schemas.auth import UserRegister, UserLogin, UserRole, TokenDict
from src.schemas.page import DataResult
from src.utils.auth import get_anon_identifier
from src.utils.jwt import create_access_token
from src.utils.chat import merge_anonymous_conversations_to_user
from src.utils.security import pwd_context

auth_router = APIRouter(prefix="/auth", tags=["Auth"])


@auth_router.post("/register", response_model=DataResult[str])
async def register(
        user: UserRegister,
        pool = Depends(get_db_pool),
        anon_identifier: str | None = Depends(get_anon_identifier),
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


@auth_router.post("/login", response_model=DataResult[str])
async def login(
        user: UserLogin,
        pool = Depends(get_db_pool),
        anon_identifier: str | None = Depends(get_anon_identifier),
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

            role = UserRole(row["role"])
            token = create_access_token(TokenDict(id=user_id, name=user.username, role=role))
            return DataResult(status=1, data=token)