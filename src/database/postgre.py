import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import os
from dotenv import load_dotenv

from psycopg_pool import AsyncConnectionPool
from psycopg import AsyncConnection
from psycopg.rows import dict_row

from src.utils.pwd import pwd_context


load_dotenv()


host = os.getenv("POSTGRESQL_HOST", "localhost")
port = os.getenv("POSTGRESQL_PORT", 5432)
user = os.getenv("POSTGRESQL_USER", "root")
password = os.getenv("POSTGRESQL_PASS")
database = os.getenv("POSTGRESQL_NAME", "order")

admin_usr = os.getenv("ADMIN_USERNAME", "admin")
admin_pwd = os.getenv("ADMIN_PASSWORD", "admin@123")

CONN_INFO = f"postgresql://{user}:{password}@{host}:{port}/{database}"

_pool: AsyncConnectionPool[AsyncConnection[dict]] | None = None


def force_selector_loop():
    if sys.platform == 'win32':
        # 如果当前 loop 已经是 Proactor，或者尚未设置，强制更换
        if not isinstance(asyncio.get_event_loop_policy(), asyncio.WindowsSelectorEventLoopPolicy):
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


async def init_pool():
    global _pool

    force_selector_loop()

    if _pool is not None:
        return _pool

    print(f"正在初始化数据库连接池...")
    _pool = AsyncConnectionPool(
        conninfo=CONN_INFO,
        min_size=2,
        max_size=20,
        open=False,  # 设为 False，由下面的 .open() 显式开启
        kwargs={
            "row_factory": dict_row,  # 使得查询结果以字典形式返回，非常方便
            "autocommit": True  # 开启自动提交，符合大多数 Web 应用逻辑
        }
    )
    await _pool.open()
    print(f"连接池初始化成功: {_pool}")
    return _pool


async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        print("数据库连接池已关闭")


async def get_db_pool() -> AsyncConnectionPool[AsyncConnection[dict]]:
    if _pool is None:
        await init_pool()
    return _pool


async def init_db():
    pool = await get_db_pool()

    async with pool.connection() as conn:
        async with conn.transaction():
            print("开始执行数据库初始化 (Schema)...")

            # 创建自动更新 updated_at 的触发器函数
            await conn.execute("""
            CREATE OR REPLACE FUNCTION update_modified_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = now();
                RETURN NEW;
            END;
            $$ language 'plpgsql';
            """)

            # 创建用户表
            await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL,
                email VARCHAR(100),
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'user',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
            )
            """)

            # 创建部分唯一索引：保证 username 在未删除用户中唯一
            await conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_active
            ON users (username)
            WHERE deleted_at IS NULL;
            """)

            # 创建索引加速按 deleted_at 过滤的查询
            await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_deleted_at
            ON users (deleted_at)
            WHERE deleted_at IS NULL;
            """)

            # 绑定触发器
            await conn.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_modified') THEN
                    CREATE TRIGGER update_user_modified
                        BEFORE UPDATE ON users
                        FOR EACH ROW
                        EXECUTE PROCEDURE update_modified_column();
                END IF;
            END $$;
            """)

            # 加入初始管理员
            hash_pwd = pwd_context.hash(admin_pwd)
            await conn.execute("""
            INSERT INTO users (username, password, role)
            SELECT %s, %s, 'admin'
            WHERE NOT EXISTS (SELECT 1
                FROM users
                WHERE username = %s AND deleted_at IS NULL);
            """, (admin_usr, hash_pwd, admin_usr))

            print("数据库初始化完成：Schema 创建成功，管理员用户已就绪。")
