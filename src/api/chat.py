import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import BaseMessage, HumanMessage, BaseMessageChunk, AIMessage

from src.database.postgre import get_db_pool
from src.find_agent.graph import create_find_graph
from src.order_agent.graph import create_order_graph
from src.schemas.auth import TokenDict
from src.schemas.chat import ThreadItem, ChatReq, ChatMessage
from src.schemas.page import NoPageResult
from src.utils.jwt import get_current_user


chat_router = APIRouter(prefix="/chat", tags=["Chat"])


GRAPH_LIST = ["find", "order"]

async def get_graph_by_name(graph: str):
    if graph == "find":
        return await create_find_graph()
    if graph == "order":
        return await create_order_graph()
    return None


@chat_router.get("", response_model=List[str])
async def get_graph(_: TokenDict = Depends(get_current_user)):
    return GRAPH_LIST


@chat_router.get("/{graph}", response_model=NoPageResult[ThreadItem])
async def get_all_threads(graph: str, user: TokenDict = Depends(get_current_user)):
    """
    查看某个 Graph 下所有的历史对话列表（从 Postgres 聚合 thread_id）。
    """
    agent = await get_graph_by_name(graph)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Graph {graph} not found")

    pool = await get_db_pool()
    thread_pattern = f"{graph}:user_{user.id}_%"

    async with pool.connection() as conn:
        cur = await conn.execute(
            """
            SELECT thread_id, MAX(checkpoint_id) as last_update
            FROM checkpoints
            WHERE thread_id LIKE %s
            GROUP BY thread_id
            ORDER BY last_update DESC
            """, (thread_pattern,))
        rows = await cur.fetchall()

        cur = await conn.execute(
            """
            SELECT COUNT(DISTINCT thread_id)
            FROM checkpoints
            WHERE thread_id LIKE %s
            """, (thread_pattern,))
        row_count = await cur.fetchone()
        total = row_count.get("count") if isinstance(row_count, dict) else row_count[0]

    res = []
    for t in rows:
        thread_id = t["thread_id"]
        config = {
            "configurable": {
                "thread_id": thread_id
            }
        }

        state = await agent.aget_state(config)

        messages = state.values.get("messages", [])

        first_msg = ""
        if messages:
            msg_content = messages[0].content
            first_msg = (msg_content[:50] + "...") if len(msg_content) > 50 else msg_content

        res.append(ThreadItem(
            thread_id=thread_id.replace(f"{graph}:", "", 1),
            summary=first_msg,
            last_id=t["last_update"])
        )

    return NoPageResult(
        total=total,
        data=res
    )


@chat_router.post("/{graph}/{thread_id}")
async def send_message_stream(graph: str, thread_id: str, req: ChatReq):
    """
    发送消息并获取回复。
    """
    agent = await get_graph_by_name(graph)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Graph {graph} not found")

    scoped_thread_id = f"{graph}:{thread_id}"
    config = {
        "configurable": {
            "thread_id": scoped_thread_id
        }
    }

    async def event_generator():
        input_data = {"messages": [HumanMessage(content=req.message)]}

        async for msg, metadata in agent.astream(
                input_data,
                config=config,
                stream_mode="messages"
        ):
            # 过滤：只处理 AI 回复的内容
            # metadata 中包含 langgraph_node，可以用来判断当前是哪个节点在说话
            if isinstance(msg, BaseMessageChunk):
                # 按照 SSE 规范格式化：data: <内容>\n\n
                yield f"data: {json.dumps({'content': msg.content, 'node': metadata.get('langgraph_node')})}\n\n"

        # 结束后发送一个特定的标记，方便前端关闭连接
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # 禁用 Nginx 缓存，确保流实时
        }
    )


@chat_router.get("/{graph}/{thread_id}", response_model=NoPageResult[ChatMessage])
async def get_chat_history(graph: str, thread_id: str):
    """
    获取某个对话的完整历史记录。
    """
    agent = await get_graph_by_name(graph)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Graph {graph} not found")

    scoped_thread_id = f"{graph}:{thread_id}"
    config = {
        "configurable": {
            "thread_id": scoped_thread_id
        }
    }

    state = await agent.aget_state(config)

    if not state or not state.values:
        return NoPageResult(total=0, data=[])

    messages: List[BaseMessage] = state.values.get("messages", [])
    data: List[ChatMessage] = []

    for msg in messages:
        if isinstance(msg, HumanMessage):
            data.append(ChatMessage(
                id=msg.id,
                role="user",
                content=msg.content
            ))
        elif isinstance(msg, AIMessage) and not msg.tool_calls:
            if isinstance(msg.content, str):
                content = msg.content
            else:
                first_item = msg.content[0] or ""
                if isinstance(first_item, dict):
                    content = first_item.get("text", "")
                else:
                    content = str(first_item)
            data.append(ChatMessage(
                id=msg.id,
                role="assistant",
                content=content
            ))


    return NoPageResult(total=len(data), data=data)