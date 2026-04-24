import json
from typing import List, Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Body
from fastapi.responses import StreamingResponse
from langchain_core.messages import BaseMessage, HumanMessage, BaseMessageChunk, AIMessage

from src.database.postgre import get_db_pool
from src.schemas.chat import AgentConfig, ChatRequest, ChatResponse, ConversationItem, MessageItem
from src.schemas.page import NoPageResult
from src.utils.auth import get_chat_entity
from src.utils.chat import AGENT_CONFIG, check_conversation_access, get_agent, get_content, prepare_chat_session


chat_router = APIRouter(
    prefix="/chat",
    tags=["Chat 聊天模块"],
    dependencies=[Depends(get_chat_entity)]
)


@chat_router.get(
    path="",
    response_model=List[AgentConfig],
    summary="获取可用的 Agent 配置",
    description="获取系统当前支持的所有 Agent 及其预设配置（语言、知识库）。"
)
async def get_agent_config():
    """
    返回系统定义的 Agent 配置列表。
    """
    return AGENT_CONFIG


@chat_router.get(
    path="/{agent_name}",
    response_model=NoPageResult[ConversationItem],
    summary="获取会话列表",
    description="查询当前用户在指定 Agent 下的所有历史对话记录，并按最后更新时间倒序排列。"
)
async def get_all_threads(
        agent_name: Annotated[str, Path(description="Agent 名称", examples=["find"])],
        user_identifier: Annotated[str, Depends(get_chat_entity)],
        pool = Depends(get_db_pool)
):
    """
    1. 从数据库查询用户关联的 conversation_id。
    2. 从 LangGraph 状态中提取第一条消息作为会话摘要。
    """
    agent = await get_agent(agent_name)

    async with pool.connection() as conn:
        cur = await conn.execute("""
        SELECT t.thread_id, MAX(c.checkpoint_id) AS last_update
        FROM chat_thread_users t
                LEFT JOIN checkpoints c ON t.thread_id = c.thread_id
        WHERE t.user_identifier = %s AND t.graph = %s
        GROUP BY t.thread_id
        ORDER BY last_update DESC NULLS LAST
        """, (user_identifier, agent_name))
        rows = await cur.fetchall()
        total = len(rows)

    res = []
    for t in rows:
        conversation_id = t["thread_id"]
        config = {
            "configurable": {
                "thread_id": conversation_id
            }
        }

        state = await agent.aget_state(config)

        messages = state.values.get("messages", [])

        summary = ""
        if messages:
            msg_content = messages[0].content
            summary = (msg_content[:50] + "...") if len(msg_content) > 50 else msg_content

        res.append(ConversationItem(
            conversation_id=conversation_id,
            summary=summary,
            last_message_id=t["last_update"])
        )

    return NoPageResult(
        total=total,
        data=res
    )


@chat_router.post(
    path="/{agent_name}/chat",
    response_model=ChatResponse,
    summary="发送消息（非流式）",
    description="与 AI 进行单次交互，等待 AI 生成完整回复后一次性返回。适用于对实时性要求不高或需要简单 API 调用的场景。"
)
async def send_message(
        agent_name: Annotated[str, Path(description="Agent 名称", examples=["find"])],
        body: Annotated[ChatRequest, Body(description="请求参数")],
        user_identifier: Annotated[str, Depends(get_chat_entity)],
        pool=Depends(get_db_pool)
):
    """
    非流式发送消息，等待 AI 生成完整回复后一次性返回。
    """
    agent, conversation_id, config = await prepare_chat_session(agent_name, body, user_identifier, pool)

    # 使用 ainvoke 获取完整响应
    input_data = {"messages": [HumanMessage(content=body.query)]}
    result = await agent.ainvoke(input_data, config=config)

    messages: List[BaseMessage] = result.get("messages", [])
    reply = messages[-1]
    message = MessageItem(
        message_id=reply.id,
        role="ai",
        content=get_content(reply.content)
    )

    return ChatResponse(
        conversation_id=conversation_id,
        message=message
    )


@chat_router.post(
    path="/{agent_name}/stream",
    summary="发送消息（流式 SSE）",
    description="与 AI 进行流式交互。服务器将以 Server-Sent Events (SSE) 格式逐字推送回复，并在结束时发送 [DONE] 标记。",
    responses={
        200: {
            "description": "返回 SSE 流式数据",
            "content": {
                "text/event-stream": {
                    "example": "data: {\"content\": \"你好\", \"node\": \"generate\"}\n\ndata: [DONE]"
                }
            }
        }
    }
)
async def send_message_stream(
        agent_name: Annotated[str, Path(description="Agent 名称", examples=["find"])],
        body: Annotated[ChatRequest, Body(description="请求参数")],
        user_identifier: Annotated[str, Depends(get_chat_entity)],
        pool = Depends(get_db_pool)
):
    """
    流式发送消息，服务器将以 Server-Sent Events (SSE) 格式逐字推送回复，并在结束时发送 [DONE] 标记。
    **前端处理建议**:
    1. 接收 `type: conversation_id` 以更新本地路由。
    2. 接收 `content` 并追加到 UI。
    3. 遇到 `[DONE]` 关闭连接。
    """
    agent, conversation_id, config = await prepare_chat_session(agent_name, body, user_identifier, pool)

    async def event_generator():
        # 首先告知前端最终的 conversation_id（如果是新建的，前端需要保存）
        yield f"data: {json.dumps({'type': 'conversation_id', 'conversation_id': conversation_id})}\n\n"

        input_data = {"messages": [HumanMessage(content=body.query)]}

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


@chat_router.get(
    path="/{agent_name}/{conversation_id}",
    response_model=NoPageResult[MessageItem],
    summary="获取历史对话详情",
    description="获取指定会话的所有消息记录。会自动过滤工具调用等中间过程，仅返回用户和 AI 的对话文字。"
)
async def get_chat_history(
        agent_name: Annotated[str, Path(description="Agent 名称", examples=["find"])],
        conversation_id: Annotated[str, Path(description="会话 ID")],
        user_identifier: Annotated[str, Depends(get_chat_entity)],
        pool = Depends(get_db_pool)
):
    """
    此接口会进行权限校验，确保当前用户只能访问自己的会话记录。
    """
    agent = await get_agent(agent_name)

    async with pool.connection() as conn:
        if not await check_conversation_access(conversation_id, user_identifier, conn):
            raise HTTPException(status_code=403, detail="Access denied")

    config = {"configurable": {"thread_id": conversation_id}}
    state = await agent.aget_state(config)

    if not state or not state.values:
        return NoPageResult(total=0, data=[])

    messages: List[BaseMessage] = state.values.get("messages", [])
    data: List[MessageItem] = []

    for msg in messages:
        if isinstance(msg, HumanMessage):
            data.append(MessageItem(
                message_id=msg.id,
                role="user",
                content=get_content(msg.content)
            ))
        elif isinstance(msg, AIMessage) and not msg.tool_calls:
            data.append(MessageItem(
                message_id=msg.id,
                role="ai",
                content=get_content(msg.content)
            ))

    return NoPageResult(total=len(data), data=data)