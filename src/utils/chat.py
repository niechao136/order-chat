import uuid
from fastapi import HTTPException
from psycopg import AsyncConnection
from typing import List

from src.find_agent.graph import create_find_graph
from src.order_agent.graph import create_order_graph
from src.schemas.chat import AgentConfig, ChatRequest


AGENT_CONFIG: List[AgentConfig] = [
    AgentConfig(name="find", lang="zh-TW", dataset="WayFinding"),
    AgentConfig(name="order", lang="zh-TW", dataset="Order"),
]


async def get_agent(name: str):
    if name == "find":
        return await create_find_graph()

    if name == "order":
        return await create_order_graph()

    raise HTTPException(status_code=404, detail="Agent not found")


async def check_conversation_access(
        conversation_id: str,
        user_identifier: str,
        conn
) -> bool:
    cur = await conn.execute(
        "SELECT 1 FROM chat_thread_users WHERE thread_id = %s AND user_identifier = %s",
        (conversation_id, user_identifier)
    )
    row = await cur.fetchone()
    return row is not None


async def merge_anonymous_conversations_to_user(
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


async def prepare_chat_session(name: str, req: ChatRequest, user_identifier: str, pool):
    """
    公共逻辑：检查 Agent、处理 conversation_id、权限校验、准备 config
    """
    agent = await get_agent(name)

    conversation_id = req.conversation_id or str(uuid.uuid4())
    if not req.conversation_id:
        async with pool.connection() as conn:
            await conn.execute(
                "INSERT INTO chat_thread_users (thread_id, user_identifier, graph) VALUES (%s, %s, %s)",
                (conversation_id, user_identifier, name)
            )
    else:
        async with pool.connection() as conn:
            if not await check_conversation_access(conversation_id, user_identifier, conn):
                raise HTTPException(status_code=403, detail="Access denied")

    config = {
        "configurable": {
            "thread_id": conversation_id,
            "collection_name": req.dataset,
            "lang": req.lang,
        }
    }

    return agent, conversation_id, config


def get_content(content: str | list[str | dict]):
    if isinstance(content, list):
        first_item = content[0] or ""
        if isinstance(first_item, dict):
            return str(first_item.get("text", ""))
        else:
            return str(first_item)
    else:
        return str(content) if content else ""
