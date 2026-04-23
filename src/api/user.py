from fastapi import APIRouter, Depends
from typing import List, Optional

from src.database.postgre import get_db_pool
from src.schemas.auth import TokenDict
from src.schemas.page import PageResult, PageParams, DataResult
from src.schemas.user import UserInfo, UserAdd, UserUpdate, UserPassword, UserDel
from src.utils.api import hand_id
from src.utils.auth import get_current_admin, get_current_user, get_optional_current_user
from src.utils.security import pwd_context


user_router = APIRouter(prefix="/user", tags=["User"])


@user_router.get("", response_model=PageResult[UserInfo])
async def user_list(
        params: PageParams = Depends(),
        _: TokenDict = Depends(get_current_admin),
        pool = Depends(get_db_pool)
):
    async with pool.connection() as conn:
        base_query = "FROM users WHERE deleted_at IS NULL"
        args = []

        if params.keyword:
            args.append(f"%{params.keyword}%")
            args.append(f"%{params.keyword}%")
            base_query += " AND (username ILIKE %s OR email ILIKE %s)"

        count_query = f"SELECT COUNT(*) {base_query}"
        cur = await conn.execute(count_query, tuple(args))
        row = await cur.fetchone()
        total = row.get("count") if isinstance(row, dict) else row[0]

        allowed_directions = {"asc", "desc"}
        direction = params.direction.lower()
        if direction not in allowed_directions:
            direction = "desc"
        sort_field = params.order_by if params.order_by in ["username", "email", "role", "updated_at"] else "id"
        final_query = f"""
                SELECT id, username, email, role, created_at, updated_at 
                {base_query}
                ORDER BY {sort_field} {direction}
                LIMIT %s OFFSET %s
                """
        args.extend([params.size, params.offset])
        cur = await conn.execute(final_query, tuple(args))
        rows = await cur.fetchall()

        return PageResult(
            total=total,
            data=[UserInfo(**hand_id(r)) for r in rows],
            page=params.page,
            size=params.size
        )


@user_router.get("/count", response_model=DataResult[int])
async def user_count(
        _: TokenDict = Depends(get_current_admin),
        pool = Depends(get_db_pool)
):
    """
    获取活跃用户总数（未软删除的用户）
    """
    async with pool.connection() as conn:
        cur = await conn.execute(
            "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL"
        )
        row = await cur.fetchone()
        count = row.get("count") if isinstance(row, dict) else row[0]
        return DataResult(status=1, data=count)


@user_router.get("/me", response_model=DataResult[UserInfo])
async def current_user(
        user: Optional[TokenDict] = Depends(get_optional_current_user),
        pool = Depends(get_db_pool)
):
    if not user:
        return DataResult(status=1, data=None)

    async with pool.connection() as conn:
        cur = await conn.execute(
            """
            SELECT id, username, email, role, created_at, updated_at
            FROM users
            WHERE id = %s AND deleted_at IS NULL
            """, (int(user.id),))
        row = await cur.fetchone()

        if not row:
            return DataResult(status=0, msg="User not found or inactive")

        return DataResult(status=1, data=UserInfo(**hand_id(row)))


@user_router.get("/{user_id}", response_model=DataResult[UserInfo])
async def user_info(
        user_id: str,
        _: TokenDict = Depends(get_current_admin),
        pool = Depends(get_db_pool)
):
    async with pool.connection() as conn:
        cur = await conn.execute(
            """
            SELECT id, username, email, role, created_at, updated_at
            FROM users
            WHERE id = %s AND deleted_at IS NULL
            """, (int(user_id),))
        row = await cur.fetchone()

        if not row:
            return DataResult(status=0, msg="User not found or inactive")

        return DataResult(status=1, data=UserInfo(**hand_id(row)))


@user_router.post("", response_model=DataResult[UserInfo])
async def add_user(
        user: UserAdd,
        _: TokenDict = Depends(get_current_admin),
        pool = Depends(get_db_pool)
):
    async with pool.connection() as conn:
        async with conn.transaction():
            cur = await conn.execute(
                "SELECT 1 FROM users WHERE username = %s AND deleted_at IS NULL",
                (user.username,)
            )
            if await cur.fetchone():
                return DataResult(status=0, msg="Username already exists")

            hash_pwd = pwd_context.hash(user.password)
            cur = await conn.execute(
                """
                INSERT INTO users (username, email, password, role)
                VALUES (%s, %s, %s, %s)
                RETURNING id, username, email, role, created_at, updated_at
                """, (user.username, user.email, hash_pwd, user.role))
            row = await cur.fetchone()

            info = UserInfo(**hand_id(row))
            return DataResult(status=1, data=info)


@user_router.put("/{user_id}", response_model=DataResult[UserInfo])
async def update_user(
        user_id: str,
        user: UserUpdate,
        _: TokenDict = Depends(get_current_admin),
        pool = Depends(get_db_pool)
):
    async with pool.connection() as conn:
        async with conn.transaction():
            target_id = int(user_id)
            cur = await conn.execute(
                "SELECT id FROM users WHERE id = %s AND deleted_at IS NULL",
                (target_id,)
            )
            if not await cur.fetchone():
                return DataResult(status=0, msg="User not found or inactive")

            cur = await conn.execute(
                """
                SELECT 1
                FROM users
                WHERE (username = %s OR email = %s)
                  AND id != %s
                  AND deleted_at IS NULL
                """,
                (user.username, user.email, target_id)
            )
            if await cur.fetchone():
                return DataResult(status=0, msg="Username or Email already taken")

            cur = await conn.execute(
                """
                UPDATE users
                SET username = %s, email = %s, role = %s
                WHERE id = %s
                RETURNING id, username, email, role, created_at, updated_at
                """, (user.username, user.email, user.role, target_id))
            row = await cur.fetchone()

            info = UserInfo(**hand_id(row))
            return DataResult(status=1, data=info)


@user_router.delete("", response_model=DataResult[List[str]])
async def delete_user(
        req: UserDel,
        _: TokenDict = Depends(get_current_admin),
        pool = Depends(get_db_pool)
):
    if not req.ids:
        return DataResult(status=0, msg="No user IDs provided")

    async with pool.connection() as conn:
        async with conn.transaction():
            try:
                target_ids = [int(uid) for uid in req.ids]
            except ValueError:
                return DataResult(status=0, msg="Invalid user ID format")

            cur = await conn.execute(
                """
                UPDATE users
                SET deleted_at = CURRENT_TIMESTAMP
                WHERE id = ANY (%s)
                  AND deleted_at IS NULL
                RETURNING id
                """,
                (target_ids,)
            )
            rows = await cur.fetchall()
            deleted_ids = [str(row.get("id")) if isinstance(row, dict) else str(row[0]) for row in rows]

            if not deleted_ids:
                return DataResult(status=0, msg="No active users found to delete")

            return DataResult(status=1, data=deleted_ids)


@user_router.patch("/me/password", response_model=DataResult[str])
async def change_my_password(
        info: UserPassword,
        user: TokenDict = Depends(get_current_user),
        pool = Depends(get_db_pool)
):
    async with pool.connection() as conn:
        async with conn.transaction():
            cur = await conn.execute(
                "SELECT id FROM users WHERE id = %s AND deleted_at IS NULL",
                (int(user.id),)
            )
            if not await cur.fetchone():
                return DataResult(status=0, msg="User not found or inactive")

            new_hash = pwd_context.hash(info.password)
            await conn.execute("UPDATE users SET password = %s WHERE id = %s", (new_hash, int(user.id)))
            return DataResult(status=1)


@user_router.patch("/{user_id}/password", response_model=DataResult[str])
async def admin_reset_password(
        user_id: str,
        info: UserPassword,
        _: TokenDict = Depends(get_current_admin),
        pool = Depends(get_db_pool)
):
    async with pool.connection() as conn:
        async with conn.transaction():
            target_id = int(user_id)
            cur = await conn.execute(
                "SELECT id FROM users WHERE id = %s AND deleted_at IS NULL",
                (target_id,)
            )
            if not await cur.fetchone():
                return DataResult(status=0, msg="User not found or inactive")

            new_hash = pwd_context.hash(info.password)
            await conn.execute("UPDATE users SET password = %s WHERE id = %s", (new_hash, target_id))
            return DataResult(status=1)