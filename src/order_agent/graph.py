import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import json
from langchain_core.messages import SystemMessage, AIMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode

from src.database.checkpointer import get_checkpointer
from src.schemas.order_chat import AgentState, OutputSchema

from .llm import base
from .prompt import SEARCH_PROMPT, CART_PROMPT, FORMAT_PROMPT
from .tool import search_product, no_search, change_cart, no_change


search_tools = [search_product, no_search]
cart_tools = [change_cart, no_change]
llm_with_search = base.bind_tools(tools=search_tools, tool_choice="required")
llm_with_cart = base.bind_tools(tools=cart_tools, tool_choice="required")
llm_with_format = base.with_structured_output(schema=OutputSchema)


async def search_node(state: AgentState, config: RunnableConfig):
    """
    搜索节点：负责阅读历史并决定是否需要搜索商品
    """
    sys_msg = SystemMessage(content=SEARCH_PROMPT)
    response = await llm_with_search.ainvoke([sys_msg] + state.messages, config)

    if response.tool_calls:
        return {"messages": [response]}
    return {"messages": []}


async def cart_node(state: AgentState, config: RunnableConfig):
    """
    订单节点：负责阅读历史并决定是否需要操作订单
    """
    cart_text = json.dumps(state.cart, ensure_ascii=False)
    sys_content = CART_PROMPT + f"\n\n【当前购物车状态】\n{cart_text}"
    sys_msg = SystemMessage(content=sys_content)
    response = await llm_with_cart.ainvoke([sys_msg] + state.messages, config)

    if response.tool_calls:
        return {"messages": [response]}
    return {"messages": []}


async def format_node(state: AgentState, config: RunnableConfig):
    cart_text = json.dumps(state.cart, ensure_ascii=False)
    sys_content = FORMAT_PROMPT + f"\n\n【当前购物车状态】\n{cart_text}"
    sys_msg = SystemMessage(content=sys_content)
    response: OutputSchema = await llm_with_format.ainvoke([sys_msg] + state.messages, config)
    content = response.model_dump_json()
    cart = state.cart
    if response.is_finish:
        cart = []
    return {
        "messages": [AIMessage(content=content)],
        "cart": cart
    }


search_tool_node = ToolNode(tools=search_tools)
cart_tool_node = ToolNode(tools=cart_tools)


def should_continue(state: AgentState):
    """
    判断逻辑：
    如果模型最后一条消息包含 tool_calls，则跳转到 tools 节点；
    否则跳转到 next 节点。
    """
    messages = state.messages
    last_message = messages[-1]

    if isinstance(last_message, AIMessage) and last_message.tool_calls:
        return "tools"
    return "next"


graph_builder = StateGraph(AgentState)
graph_builder.add_node("search", search_node)
graph_builder.add_node("cart", cart_node)
graph_builder.add_node("format", format_node)
graph_builder.add_node("search_tools", search_tool_node)
graph_builder.add_node("cart_tools", cart_tool_node)
graph_builder.add_edge(START, "search")
graph_builder.add_conditional_edges("search", should_continue, {"tools": "search_tools", "next": "cart"})
graph_builder.add_edge("search_tools", "cart")
graph_builder.add_conditional_edges("cart", should_continue, {"tools": "cart_tools", "next": "format"})
graph_builder.add_edge("cart_tools", "format")
graph_builder.add_edge("format", END)


async def create_order_graph():
    checkpointer = await get_checkpointer()

    _graph = graph_builder.compile(checkpointer=checkpointer)

    return _graph


graph = create_order_graph