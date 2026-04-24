import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

from langchain_core.messages import SystemMessage, AIMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode

from src.database.checkpointer import get_checkpointer
from src.schemas.find_agent import AgentState, OutputSchema

from .llm import base
from .prompt import BRAIN_SYSTEM_PROMPT, SYSTEM_PROMPT
from .tool import search_product, complete_task


tools = [search_product, complete_task]
llm_with_tool = base.bind_tools(tools=tools, tool_choice="required")
llm_with_format = base.with_structured_output(schema=OutputSchema)


async def call_model(state: AgentState, config: RunnableConfig):
    """
    大脑节点：负责阅读历史并决定是否调用工具
    """
    sys_msg = SystemMessage(content=BRAIN_SYSTEM_PROMPT)
    response = await llm_with_tool.ainvoke([sys_msg] + state.messages, config)

    if response.tool_calls:
        return {"messages": [response]}
    return {}


async def format_node(state: AgentState, config: RunnableConfig):
    configurable = config.get("configurable", {})
    lang = configurable.get("lang", "zh-TW")
    sys_msg = SystemMessage(content=SYSTEM_PROMPT.replace("[LANG]", lang))
    response: OutputSchema = await llm_with_format.ainvoke([sys_msg] + state.messages, config)
    content = response.model_dump_json()
    return {
        "messages": [AIMessage(content=content)]
    }



tool_node = ToolNode(tools=tools)


def should_continue(state: AgentState):
    """
    判断逻辑：
    如果模型最后一条消息包含 tool_calls，则跳转到 tools 节点；
    否则结束会话。
    """
    messages = state.messages
    last_message = messages[-1]

    if isinstance(last_message, AIMessage) and last_message.tool_calls:
        return "tools"
    return "format"


graph_builder = StateGraph(AgentState)
graph_builder.add_node("agent", call_model)
graph_builder.add_node("format", format_node)
graph_builder.add_node("tools", tool_node)
graph_builder.add_edge(START, "agent")
graph_builder.add_conditional_edges("agent", should_continue, {"tools": "tools", "format": "format"})
graph_builder.add_edge("tools", "format")
graph_builder.add_edge("format", END)


async def create_find_graph():
    checkpointer = await get_checkpointer()

    _graph = graph_builder.compile(checkpointer=checkpointer)

    return _graph


graph = create_find_graph