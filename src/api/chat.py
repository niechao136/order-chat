import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import BaseMessage, HumanMessage, BaseMessageChunk

from src.database.postgre import get_db_pool
from src.find_agent.graph import create_find_graph
from src.schemas.auth import TokenDict
from src.schemas.chat import ThreadItem, ChatReq
from src.schemas.page import PageResult, PageParams, NoPageResult
from src.utils.jwt import get_current_user


chat_router = APIRouter(prefix="/chat", tags=["Chat"])


async def get_graph_by_name(graph: str):
    if graph == "find":
        return await create_find_graph()
    return None


@chat_router.get("/{graph}", response_model=PageResult[ThreadItem])
async def get_all_threads(graph: str, params: PageParams = Depends(), user: TokenDict = Depends(get_current_user)):
    """
    查看某个 Graph 下所有的历史对话列表（从 Postgres 聚合 thread_id）。
    """
    agent = await get_graph_by_name(graph)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Graph {graph} not found")

    pool = await get_db_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("""
        SELECT thread_id, MAX(checkpoint_id) as last_update
        FROM checkpoints
        WHERE checkpoint_ns = $1 AND thread_id LIKE $2
        GROUP BY thread_id
        ORDER BY last_update DESC
        LIMIT $3 OFFSET $4
        """, f"graph_{graph}", f"user_{user.id}_%", params.size, params.offset)
        total = await conn.fetchval("""
        SELECT COUNT(*)
        FROM checkpoints
        WHERE checkpoint_ns = $1 AND thread_id LIKE $2
        """, f"graph_{graph}", f"user_{user.id}_%")

    res = []
    for t in rows:
        thread_id = t["thread_id"]
        config = {"configurable": {"thread_id": thread_id, "checkpoint_ns": f"graph_{graph}"}}

        state = await agent.get_state(config)

        messages = state.values.get("messages", [])

        first_msg = ""
        if messages:
            first_msg = messages[0].content[:50]  # 只取前50个字符

        res.append(ThreadItem(thread_id=thread_id, summary=first_msg, last_id=t["last_update"]))

    return PageResult(
        total=total,
        data=res,
        page=params.page,
        size=params.size
    )


@chat_router.post("/{graph}/{thread_id}")
async def send_message_stream(graph: str, thread_id: str, req: ChatReq):
    """
    发送消息并获取回复。
    """
    agent = await get_graph_by_name(graph)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Graph {graph} not found")

    config = {
        "configurable": {
            "thread_id": thread_id,
            "checkpoint_ns": f"graph_{graph}"  # 确保与 ainvoke 时一致
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


@chat_router.get("/{graph}/{thread_id}", response_model=NoPageResult[BaseMessage])
async def get_chat_history(graph: str, thread_id: str):
    """
    获取某个对话的完整历史记录。
    """
    agent = await get_graph_by_name(graph)
    if not agent:
        raise HTTPException(status_code=404, detail=f"Graph {graph} not found")

    config = {
        "configurable": {
            "thread_id": thread_id,
            "checkpoint_ns": f"graph_{graph}"  # 确保与 ainvoke 时一致
        }
    }

    state = await agent.get_state(config)

    if not state or not state.values:
        return NoPageResult(total=0, data=[])

    messages: List[BaseMessage] = state.values.get("messages", [])

    return NoPageResult(total=len(messages), data=messages)