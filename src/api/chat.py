import json
import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import BaseMessage, HumanMessage, BaseMessageChunk, AIMessage

from src.database.postgre import get_db_pool
from src.schemas.chat import ThreadItem, ChatReq, ChatMessage, GraphConfig
from src.schemas.page import NoPageResult
from src.utils.auth import get_chat_entity
from src.utils.chat import check_thread_access, GRAPH_CONFIG, get_graph_by_name


chat_router = APIRouter(prefix="/chat", tags=["Chat"], dependencies=[Depends(get_chat_entity)])


@chat_router.get("", response_model=List[GraphConfig])
async def get_graph():
    return GRAPH_CONFIG


@chat_router.get("/{graph}", response_model=NoPageResult[ThreadItem])
async def get_all_threads(
        graph: str,
        user_identifier: str = Depends(get_chat_entity),
        pool = Depends(get_db_pool)
):
    """
    查看某个 Graph 下所有的历史对话列表（从 Postgres 聚合 thread_id）。
    """
    agent = await get_graph_by_name(graph)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Graph {graph} not found")


    async with pool.connection() as conn:
        cur = await conn.execute("""
        SELECT t.thread_id, MAX(c.checkpoint_id) AS last_update
        FROM chat_thread_users t
                LEFT JOIN checkpoints c ON t.thread_id = c.thread_id
        WHERE t.user_identifier = %s AND t.graph = %s
        GROUP BY t.thread_id
        ORDER BY last_update DESC NULLS LAST
        """, (user_identifier, graph))
        rows = await cur.fetchall()
        total = len(rows)

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


@chat_router.post("/{graph}/stream")
async def send_message_stream(
        graph: str,
        req: ChatReq,
        user_identifier: str = Depends(get_chat_entity),
        pool = Depends(get_db_pool)
):
    """
    发送消息并获取回复。
    """
    agent = await get_graph_by_name(graph)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Graph {graph} not found")

    thread_id = req.thread_id
    # 若未提供 thread_id，则新建会话并插入关联
    if not thread_id:
        thread_id = str(uuid.uuid4())
        async with pool.connection() as conn:
            await conn.execute(
                "INSERT INTO chat_thread_users (thread_id, user_identifier, graph) VALUES (%s, %s, %s)",
                (thread_id, user_identifier, graph)
            )
    else:
        # 权限校验
        async with pool.connection() as conn:
            if not await check_thread_access(thread_id, user_identifier, conn):
                raise HTTPException(status_code=403, detail="Access denied")

    config = {
        "configurable": {
            "thread_id": thread_id,
            "collection_name": req.collection_name,
            "lang": req.lang,
        }
    }

    async def event_generator():
        # 首先告知前端最终的 thread_id（如果是新建的，前端需要保存）
        yield f"data: {json.dumps({'type': 'thread_id', 'thread_id': thread_id})}\n\n"

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
async def get_chat_history(
        graph: str,
        thread_id: str,
        user_identifier: str = Depends(get_chat_entity),
        pool = Depends(get_db_pool)
):
    """
    获取某个对话的完整历史记录。
    """
    agent = await get_graph_by_name(graph)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Graph {graph} not found")

    async with pool.connection() as conn:
        if not await check_thread_access(thread_id, user_identifier, conn):
            raise HTTPException(status_code=403, detail="Access denied")

    config = {"configurable": {"thread_id": thread_id}}
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
            if isinstance(msg.content, list):
                first_item = msg.content[0] or ""
                if isinstance(first_item, dict):
                    content = str(first_item.get("text", ""))
                else:
                    content = str(first_item)
            else:
                content = str(msg.content) if msg.content else ""
            data.append(ChatMessage(
                id=msg.id,
                role="assistant",
                content=content
            ))

    return NoPageResult(total=len(data), data=data)