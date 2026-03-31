import os
from dotenv import load_dotenv

import asyncpg


load_dotenv()


host = os.getenv("POSTGRESQL_HOST", "localhost")
port = os.getenv("POSTGRESQL_PORT", 5432)
user = os.getenv("POSTGRESQL_USER", "root")
password = os.getenv("POSTGRESQL_PASS")
database = os.getenv("POSTGRESQL_NAME", "order")

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