from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg.errors import UniqueViolation

from .postgre import get_db_pool


_cached_checkpointer: AsyncPostgresSaver | None = None


async def get_checkpointer():
    global _cached_checkpointer

    if _cached_checkpointer:
        return _cached_checkpointer

    conn = await get_db_pool()

    checkpointer = AsyncPostgresSaver(conn)

    try:
        # 尝试初始化表结构
        await checkpointer.setup()
    except UniqueViolation:
        # 如果报错说已经有了（唯一性冲突），直接忽略即可
        # 这说明表结构已经准备好了
        pass
    except Exception as e:
        # 其他错误还是要报出来的
        print(f"Setup warning: {e}")

    _cached_checkpointer = checkpointer

    return _cached_checkpointer