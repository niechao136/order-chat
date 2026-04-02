import os
from dotenv import load_dotenv

import asyncpg
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

_pool: asyncpg.Pool | None = None


async def init_pool():
    global _pool
    print(f"init_pool: {_pool}")
    _pool = await asyncpg.create_pool(
        dsn=f"postgresql://{user}:{password}@{host}:{port}/{database}",
        min_size=1,  # 最小连接数
        max_size=20  # 最大连接数
    )
    print(f"init_pool: {_pool}")


async def close_pool():
    await _pool.close()


async def get_db_pool() -> asyncpg.Pool:
    return _pool


async def init_db():
    pool = await get_db_pool()
    print(f"init_db: {pool}")
    async with pool.acquire() as conn:
        async with conn.transaction():
            print(f"init_db 开始: {pool}")
            # 创建函数
            await conn.execute("""
            CREATE OR REPLACE FUNCTION update_modified_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = now();
                RETURN NEW;
            END;
            $$ language 'plpgsql';
            """)
            print(f"init_db 创建函数: {pool}")
            # 创建用户表
            await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100),
                password VARCHAR(255) NOT NULL,
                role VARCHAR(20) NOT NULL DEFAULT 'user',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
            """)
            print(f"init_db 创建用户表: {pool}")
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
            print(f"init_db 绑定触发器: {pool}")
            # 加入初始管理员
            hash_pwd = pwd_context.hash(admin_pwd)
            await conn.execute("""
            INSERT INTO users (username, password, role)
            VALUES ($1, $2, 'admin')
            ON CONFLICT (username) DO NOTHING;
            """, admin_usr, hash_pwd)
            print(f"init_db 加入初始管理员: {pool}")


_conn: AsyncConnectionPool[AsyncConnection[dict]] | None = None

async def init_conn():
    global _conn
    print(f"init_conn: {_conn}")
    _conn = AsyncConnectionPool(
        conninfo=f"postgresql://{user}:{password}@{host}:{port}/{database}",
        max_size=20,
        open=False,
        kwargs={
            "row_factory": dict_row,
            "autocommit": True
        }
    )
    await _conn.open()
    print(f"init_conn: {_conn}")

async def get_db_conn() -> AsyncConnectionPool[AsyncConnection[dict]]:
    if not _conn:
        await init_conn()
    return _conn