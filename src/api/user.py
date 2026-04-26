from fastapi import APIRouter, Depends, Path, Body
from typing import List, Optional, Annotated

from src.database.postgre import get_db_pool
from src.schemas.auth import TokenDict
from src.schemas.page import PageResult, PageParams, DataResult
from src.schemas.user import UserInfo, UserAdd, UserUpdate, UserPassword, UserDel
from src.utils.api import hand_id
from src.utils.auth import get_current_admin, get_current_user, get_optional_current_user
from src.utils.security import pwd_context


user_router = APIRouter(
    prefix="/user",
    tags=["User 管理"]
)


@user_router.get(
    path="",
    response_model=PageResult[UserInfo],
    summary="获取用户列表",
    description="分页获取所有未删除的用户。支持按用户名或邮箱模糊搜索，按指定字段排序。",
)
async def user_list(
    params: Annotated[PageParams, Depends()],
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


@user_router.get(
    path="/count",
    response_model=DataResult[int],
    summary="获取活跃用户总数",
    description="返回未软删除的用户数量。"
)
async def user_count(
    _: TokenDict = Depends(get_current_admin),
    pool = Depends(get_db_pool)
):
    async with pool.connection() as conn:
        cur = await conn.execute(
            "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL"
        )
        row = await cur.fetchone()
        count = row.get("count") if isinstance(row, dict) else row[0]
        return DataResult(status=1, data=count)


@user_router.get(
    path="/me",
    response_model=DataResult[Optional[UserInfo]],
    summary="获取当前登录用户信息",
    description="如果已登录，返回当前用户的详细信息；未登录时返回 data 为 null。"
)
async def current_user(
    user: Annotated[Optional[TokenDict], Depends(get_optional_current_user)],
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


@user_router.get(
    path="/{user_id}",
    response_model=DataResult[UserInfo],
    summary="获取指定用户信息",
    description="根据用户 ID 获取用户详情，需要管理员权限。"
)
async def user_info(
    user_id: Annotated[str, Path(description="用户 ID")],
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


@user_router.post(
    path="",
    response_model=DataResult[UserInfo],
    summary="新增用户",
    description="管理员创建新用户，提供用户名、邮箱、密码和角色。用户名不能与已存在的活跃用户重复。"
)
async def add_user(
    user: Annotated[UserAdd, Body(description="用户信息")],
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


@user_router.put(
    path="/{user_id}",
    response_model=DataResult[UserInfo],
    summary="更新用户信息",
    description="按 ID 更新用户资料，包括用户名、邮箱、角色。不能修改密码。"
)
async def update_user(
    user_id: Annotated[str, Path(description="要更新的用户 ID")],
    user: Annotated[UserUpdate, Body(description="用户更新数据")],
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


@user_router.delete(
    path="",
    response_model=DataResult[List[str]],
    summary="批量软删除用户",
    description="根据提供的用户 ID 列表执行软删除操作（设置 deleted_at 时间戳）。"
)
async def delete_user(
    req: Annotated[UserDel, Body(description="包含要删除的用户 ID 列表")],
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


@user_router.patch(
    path="/me/password",
    response_model=DataResult[str],
    summary="当前用户修改密码",
    description="当前登录用户修改自己的密码，需要提供新密码。"
)
async def change_my_password(
    info: Annotated[UserPassword, Body(description="新密码")],
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


@user_router.patch(
    path="/{user_id}/password",
    response_model=DataResult[str],
    summary="管理员重置用户密码",
    description="管理员为指定用户 ID 重置密码。"
)
async def admin_reset_password(
    user_id: Annotated[str, Path(description="目标用户 ID")],
    info: Annotated[UserPassword, Body(description="新密码")],
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