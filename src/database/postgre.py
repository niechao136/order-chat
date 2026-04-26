import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import os
from dotenv import load_dotenv
from typing import Any, Optional

from psycopg_pool import AsyncConnectionPool
from psycopg import AsyncConnection
from psycopg.rows import dict_row

from src.utils.security import pwd_context


load_dotenv()


host = os.getenv("POSTGRESQL_HOST", "localhost")
port = os.getenv("POSTGRESQL_PORT", 5432)
user = os.getenv("POSTGRESQL_USER", "root")
password = os.getenv("POSTGRESQL_PASS")
database = os.getenv("POSTGRESQL_NAME", "order")

admin_usr = os.getenv("ADMIN_USERNAME", "admin")
admin_pwd = os.getenv("ADMIN_PASSWORD", "admin@123")

CONN_INFO = f"postgresql://{user}:{password}@{host}:{port}/{database}"

_pool: Optional[AsyncConnectionPool[AsyncConnection[Any]]] = None


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
    pool = AsyncConnectionPool(
        conninfo=CONN_INFO,
        min_size=2,
        max_size=20,
        open=False,  # 设为 False，由下面的 .open() 显式开启
        kwargs={
            "row_factory": dict_row,  # 使得查询结果以字典形式返回，非常方便
            "autocommit": True  # 开启自动提交，符合大多数 Web 应用逻辑
        }
    )
    await pool.open()
    _pool = pool
    print(f"连接池初始化成功: {_pool}")
    return pool


async def close_pool():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        print("数据库连接池已关闭")


async def get_db_pool() -> AsyncConnectionPool[AsyncConnection[Any]]:
    if _pool is None:
        return await init_pool()
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

            # ---------- 创建用户表 ----------
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

            # 部分唯一索引：保证 username 在未删除用户中唯一
            await conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_active
            ON users (username)
            WHERE deleted_at IS NULL;
            """)

            # 索引加速按 deleted_at 过滤的查询
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

            # ---------- 创建字段定义表 collection_fields ----------
            await conn.execute("""
            CREATE TABLE IF NOT EXISTS collection_fields (
                id SERIAL PRIMARY KEY,
                collection_name VARCHAR(255) NOT NULL,
                field_name VARCHAR(255) NOT NULL,
                field_type VARCHAR(50) NOT NULL,
                is_required BOOLEAN DEFAULT FALSE,
                default_value JSONB,
                description TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
            )
            """)

            # 为 collection_name 创建索引，加速查询
            await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_collection_fields_collection_name
            ON collection_fields (collection_name)
            WHERE deleted_at IS NULL;
            """)

            # 部分唯一索引：保证同一集合内，未删除的字段名唯一
            await conn.execute("""
            CREATE UNIQUE INDEX IF NOT EXISTS collection_fields_active_unique
            ON collection_fields (collection_name, field_name)
            WHERE deleted_at IS NULL;
            """)

            # 索引加速按 deleted_at 过滤的查询
            await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_collection_fields_deleted_at
            ON collection_fields (deleted_at)
            WHERE deleted_at IS NULL;
            """)

            # 绑定 updated_at 触发器
            await conn.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_collection_fields_modified') THEN
                    CREATE TRIGGER update_collection_fields_modified
                        BEFORE UPDATE ON collection_fields
                        FOR EACH ROW
                        EXECUTE PROCEDURE update_modified_column();
                END IF;
            END $$;
            """)

            # ---------- 创建用户与会话关联表 ----------
            await conn.execute("""
            CREATE TABLE IF NOT EXISTS chat_thread_users
            (
                thread_id       VARCHAR(255) NOT NULL,
                user_identifier VARCHAR(255) NOT NULL,
                graph           VARCHAR(50)  NOT NULL,
                created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (thread_id, user_identifier)
            )
            """)

            await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_chat_thread_users_user_graph
                ON chat_thread_users (user_identifier, graph);
            """)

            await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_chat_thread_users_thread_id
                ON chat_thread_users (thread_id);
            """)

            # ---------- 创建 API 密钥表 ----------
            await conn.execute("""
            CREATE TABLE IF NOT EXISTS api_keys
            (
                id           UUID PRIMARY KEY         DEFAULT gen_random_uuid(),
                user_id      INTEGER REFERENCES users (id) ON DELETE CASCADE,
                name         VARCHAR(100)        NOT NULL,
                key_hash     VARCHAR(255) UNIQUE NOT NULL,
                prefix       VARCHAR(8)          NOT NULL,
                key_encrypted BYTEA,
                permissions  JSONB                    DEFAULT '[]'::jsonb,
                rate_limit   INTEGER                  DEFAULT 0,
                created_at   TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                last_used_at TIMESTAMP WITH TIME ZONE,
                expires_at   TIMESTAMP WITH TIME ZONE,
                is_active    BOOLEAN                  DEFAULT TRUE,
                description  TEXT
            )
            """)

            await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys (prefix);
            """)

            await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys (user_id);
            """)

            await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys (expires_at) WHERE expires_at IS NOT NULL;
            """)

            # ---------- 创建 API 密钥使用日志表 ----------
            await conn.execute("""
            CREATE TABLE IF NOT EXISTS api_key_usage
            (
                id              BIGSERIAL PRIMARY KEY,
                key_id          UUID REFERENCES api_keys (id) ON DELETE SET NULL,
                endpoint        VARCHAR(200),
                ip_address      INET,
                user_agent      TEXT,
                response_status INTEGER,
                created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
            """)

            await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_api_key_usage_key_id ON api_key_usage (key_id);
            """)

            await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_api_key_usage_created_at ON api_key_usage (created_at);
            """)

            print("数据库初始化完成：Schema 创建成功，管理员用户已就绪。")
