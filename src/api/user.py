from fastapi import APIRouter, Depends

from src.database.postgre import get_db_pool
from src.schemas.auth import TokenDict
from src.schemas.page import PageResult, PageParams, DataResult
from src.schemas.user import UserInfo, UserAdd, UserUpdate, UserPassword
from src.utils.jwt import get_current_admin, get_current_user
from src.utils.api import hand_id
from src.utils.pwd import pwd_context


user_router = APIRouter(prefix="/user", tags=["User"])


@user_router.get("/", response_model=PageResult[UserInfo])
async def user_list(params: PageParams = Depends(), _: TokenDict = Depends(get_current_admin)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        base_query = "FROM users WHERE 1=1"
        args = []

        if params.keyword:
            args.append(f"%{params.keyword}%")
            base_query += f" AND (username ILIKE ${len(args)} OR email ILIKE ${len(args)})"

        count_query = f"SELECT COUNT(*) {base_query}"
        total = await conn.fetchval(count_query, *args)

        sort_field = params.order_by if params.order_by in ["created_at", "username"] else "id"

        final_query = f"""
        SELECT id, username, email, role, created_at, updated_at 
        {base_query}
        ORDER BY {sort_field} {params.direction}
        LIMIT ${len(args) + 1} OFFSET ${len(args) + 2}
        """

        args.extend([params.size, params.offset])
        rows = await conn.fetch(final_query, *args)


        return PageResult(
            total=total,
            data=[UserInfo(**hand_id(r)) for r in rows],
            page=params.page,
            size=params.size
        )


@user_router.get("/me", response_model=DataResult[UserInfo])
async def current_user(user: TokenDict = Depends(get_current_user)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, username, email, role, created_at, updated_at
            FROM users
            WHERE id = $1
            """, int(user.id))
        return DataResult(status=1, data=UserInfo(**hand_id(row)), msg=None)


@user_router.get("/{user_id}", response_model=DataResult[UserInfo])
async def user_info(user_id: str, _: TokenDict = Depends(get_current_admin)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, username, email, role, created_at, updated_at
            FROM users
            WHERE id = $1
            """, int(user_id))
        return DataResult(status=1, data=UserInfo(**hand_id(row)), msg=None)


@user_router.post("/", response_model=DataResult[UserInfo])
async def add_user(user: UserAdd, _: TokenDict = Depends(get_current_admin)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            exists = await conn.fetchval("SELECT 1 FROM users WHERE username=$1", user.username)
            if exists:
                return DataResult(status=0, msg="Username already exists", data=None)
            hash_pwd = pwd_context.hash(user.password)
            row = await conn.fetchrow(
                """
                INSERT INTO users (username, email, password, role)
                VALUES ($1, $2, $3, $4)
                RETURNING id, username, email, role, created_at, updated_at
                """, user.username, user.email, hash_pwd, user.role)
            info = UserInfo(**hand_id(row))
            return DataResult(status=1, msg=None, data=info)


@user_router.put("/{user_id}", response_model=DataResult[UserInfo])
async def update_user(user_id: str, user: UserUpdate, _: TokenDict = Depends(get_current_admin)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            target_id = int(user_id)
            current_row = await conn.fetchrow("SELECT id FROM users WHERE id = $1", target_id)
            if not current_row:
                return DataResult(status=0, msg="User not found", data=None)

            conflict = await conn.fetchval(
                "SELECT 1 FROM users WHERE (username = $1 OR email = $2) AND id != $3",
                user.username, user.email, target_id
            )
            if conflict:
                return DataResult(status=0, msg="Username or Email already taken", data=None)

            row = await conn.fetchrow(
                """
                UPDATE users 
                SET username=$1, email=$2, role=$3
                WHERE id=$4
                RETURNING id, username, email, role, created_at, updated_at
                """, user.username, user.email, user.role, target_id)
            info = UserInfo(**hand_id(row))
            return DataResult(status=1, msg=None, data=info)


@user_router.patch("/me/password", response_model=DataResult[str])
async def change_my_password(info: UserPassword, user: TokenDict = Depends(get_current_user)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            new_hash = pwd_context.hash(info.password)
            await conn.execute("UPDATE users SET password = $1 WHERE id = $2", new_hash, int(user.id))
            return DataResult(status=1, msg=None, data=None)


@user_router.patch("/{user_id}/password", response_model=DataResult[str])
async def admin_reset_password(user_id: str, info: UserPassword, _: TokenDict = Depends(get_current_admin)):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            target_id = int(user_id)
            current_row = await conn.fetchrow("SELECT id FROM users WHERE id = $1", target_id)
            if not current_row:
                return DataResult(status=0, msg="User not found", data=None)

            new_hash = pwd_context.hash(info.password)
            await conn.execute("UPDATE users SET password = $1 WHERE id = $2", new_hash, target_id)
            return DataResult(status=1, msg=None, data=None)