from psycopg import AsyncConnection
from typing import List

from src.find_agent.graph import create_find_graph
from src.order_agent.graph import create_order_graph
from src.schemas.chat import GraphConfig


GRAPH_LIST = ["find", "order"]

GRAPH_CONFIG: List[GraphConfig] = [
    GraphConfig(name="find", lang="zh-TW", collection_name="WayFind"),
    GraphConfig(name="order", lang="zh-TW", collection_name="Order"),
]


async def get_graph_by_name(graph: str):
    if graph == "find":
        return await create_find_graph()
    if graph == "order":
        return await create_order_graph()
    return None


async def check_thread_access(thread_id: str, user_identifier: str, conn) -> bool:
    cur = await conn.execute(
        "SELECT 1 FROM chat_thread_users WHERE thread_id = %s AND user_identifier = %s",
        (thread_id, user_identifier)
    )
    row = await cur.fetchone()
    return row is not None


async def merge_anonymous_threads_to_user(
        conn: AsyncConnection,
        user_identifier: str,  # 例如 "user_123"
        anon_identifier: str  # 例如 "anon_abc-def"
) -> int:
    """
    将匿名用户的所有会话关联复制给登录用户。
    返回实际新增的关联数量。
    """
    result = await conn.execute("""
    INSERT INTO chat_thread_users (thread_id, user_identifier, graph)
    SELECT thread_id, %s, graph
    FROM chat_thread_users
    WHERE user_identifier = %s
    ON CONFLICT (thread_id, user_identifier) DO NOTHING
    """, (user_identifier, anon_identifier))

    # psycopg 的 rowcount 可以获取影响行数
    merged_count = result.rowcount
    return merged_count