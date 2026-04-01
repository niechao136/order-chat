import os
from dotenv import load_dotenv

import asyncpg

from ..utils.pwd import pwd_context


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
    _pool = await asyncpg.create_pool(
        dsn=f"postgresql://{user}:{password}@{host}:{port}/{database}",
        min_size=5,  # 最小连接数
        max_size=20  # 最大连接数
    )


async def close_pool():
    await _pool.close()


async def get_db_pool() -> asyncpg.Pool:
    return _pool


async def init_db():
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
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
            VALUES ($1, $2, 'admin')
            ON CONFLICT (username) DO NOTHING;
            """, admin_usr, hash_pwd)