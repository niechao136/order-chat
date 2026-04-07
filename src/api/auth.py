from fastapi import APIRouter

from src.database.postgre import get_db_pool
from src.schemas.auth import UserRegister, UserLogin, UserRole, TokenDict, TokenResponse, TokenSuccessResponse, TokenErrorResponse
from src.utils.jwt import create_access_token
from src.utils.pwd import pwd_context

auth_router = APIRouter(prefix="/auth", tags=["Auth"])


@auth_router.post("/register", response_model=TokenResponse)
async def register(user: UserRegister):
    hash_pwd = pwd_context.hash(user.password)
    pool = await get_db_pool()
    async with pool.connection() as conn:

        cur = await conn.execute("SELECT 1 FROM users WHERE username = %s", (user.username,))
        exists = await cur.fetchone()

        if exists:
            return TokenErrorResponse(status=0, error_msg="Username already exists")

        cur = await conn.execute(
            """
            INSERT INTO users (username, email, password, role)
            VALUES (%s, %s, %s, %s) RETURNING id
            """, (user.username, user.email, hash_pwd, user.role)
        )
        row = await cur.fetchone()

        user_id = str(row["id"])
        token = create_access_token(TokenDict(id=user_id, name=user.username, role=user.role))
        return TokenSuccessResponse(status=1, access_token=token, role=user.role)


@auth_router.post("/login", response_model=TokenResponse)
async def login(user: UserLogin):
    pool = await get_db_pool()
    async with pool.connection() as conn:
        cur = await conn.execute(
            "SELECT id, username, password, role FROM users WHERE username = %s",
            (user.username,)
        )
        row = await cur.fetchone()

        if not row or not pwd_context.verify(user.password, row["password"]):
            return TokenErrorResponse(status=0, error_msg="Username or password is incorrect")

        user_id = str(row["id"])
        role = UserRole(row["role"])
        token = create_access_token(TokenDict(id=user_id, name=user.username, role=role))
        return TokenSuccessResponse(status=1, access_token=token, role=role)