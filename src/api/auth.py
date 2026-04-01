from fastapi import APIRouter

from ..database.postgre import get_db_pool
from ..types.auth import UserRegister, UserLogin, UserRole, TokenDict, TokenResponse, TokenSuccessResponse, TokenErrorResponse
from ..utils.jwt import create_access_token
from ..utils.pwd import pwd_context

auth_router = APIRouter(prefix="/auth", tags=["Auth"])


@auth_router.post("/register", response_model=TokenResponse)
async def register(user: UserRegister):
    hash_pwd = pwd_context.hash(user.password)
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        exists = await conn.fetchval("SELECT 1 FROM users WHERE username=$1", user.username)
        if exists:
            return TokenErrorResponse(status=0, error_msg="Username already exists")
        row = await conn.fetchrow(
            """
            INSERT INTO users (username, email, password, role)
            VALUES ($1, $2, $3, $4) RETURNING id
            """, user.username, user.email, hash_pwd, user.role)
        user_id = str(row["id"])
        token = create_access_token(TokenDict(id=user_id, name=user.username, role=user.role))
        return TokenSuccessResponse(status=1, access_token=token, role=user.role)


@auth_router.post("/login", response_model=TokenResponse)
async def login(user: UserLogin):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT id, username, password, role FROM users WHERE username=$1", user.username)
        if not row or not pwd_context.verify(user.password, row["password"]):
            return TokenErrorResponse(status=0, error_msg="Username or password is incorrect")
        user_id = str(row["id"])
        role = UserRole(row["role"])
        token = create_access_token(TokenDict(id=user_id, name=user.username, role=role))
        return TokenSuccessResponse(status=1, access_token=token, role=role)