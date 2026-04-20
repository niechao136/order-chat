import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import json
from typing import cast
from langchain_core.messages import SystemMessage, AIMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode

from src.database.checkpointer import get_checkpointer
from src.schemas.order_chat import AgentState, OutputSchema, IntentSchema, OperatorSchema

from .llm import base
from .prompt import SEARCH_PROMPT, CART_PROMPT, FORMAT_PROMPT, INTENT_PROMPT
from .tool import search_product, no_search
from .util import update_cart


search_tools = [search_product, no_search]
llm_with_search = base.bind_tools(tools=search_tools, tool_choice="required")
llm_with_cart = base.with_structured_output(schema=OperatorSchema)
llm_with_format = base.with_structured_output(schema=OutputSchema)
llm_with_intent = base.with_structured_output(schema=IntentSchema)


async def intent_node(state: AgentState, config: RunnableConfig):
    """
    意图节点：负责阅读历史并判断用户意图
    """
    sys_msg = SystemMessage(content=INTENT_PROMPT)
    response = await llm_with_intent.ainvoke([sys_msg] + state.messages, config)
    res = cast(IntentSchema, response)

    return {"messages": [], "intent": res.intent}


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
    cart_text =  json.dumps([item.model_dump() for item in state.cart], ensure_ascii=False)
    sys_content = CART_PROMPT + f"\n\n【当前购物车状态】\n{cart_text}"
    sys_msg = SystemMessage(content=sys_content)
    response = await llm_with_cart.ainvoke([sys_msg] + state.messages, config)
    res = cast(OperatorSchema, response)

    new_cart = update_cart(state.cart, res)

    return {"messages": [], "cart": new_cart}


async def format_node(state: AgentState, config: RunnableConfig):
    cart_text = json.dumps([item.model_dump() for item in state.cart], ensure_ascii=False)
    sys_content = FORMAT_PROMPT + f"\n\n【当前购物车状态】\n{cart_text}"
    sys_msg = SystemMessage(content=sys_content)
    response = await llm_with_format.ainvoke([sys_msg] + state.messages, config)
    content = response.model_dump_json()
    cart = state.cart
    if response.is_finish:
        cart = []
    return {"messages": [AIMessage(content=content)], "cart": cart}


tool_node = ToolNode(tools=search_tools)


def intent_cond(state: AgentState):
    if state.intent == "chat" or state.intent == "cancel" or state.intent == "checkout":
        return "format"
    return "next"


def search_cond(state: AgentState):
    if state.intent == "query":
        return "format"
    return "next"


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
graph_builder.add_node("intent", intent_node)
graph_builder.add_node("search", search_node)
graph_builder.add_node("cart", cart_node)
graph_builder.add_node("format", format_node)
graph_builder.add_node("tools", tool_node)
graph_builder.add_edge(START, "intent")
graph_builder.add_conditional_edges("intent", intent_cond, {"next": "search", "format": "format"})
graph_builder.add_conditional_edges("search", should_continue, {"tools": "tools", "next": "cart"})
graph_builder.add_conditional_edges("tools", search_cond, {"next": "cart", "format": "format"})
graph_builder.add_edge("cart", "format")
graph_builder.add_edge("format", END)


async def create_order_graph():
    checkpointer = await get_checkpointer()

    _graph = graph_builder.compile(checkpointer=checkpointer)

    return _graph


graph = create_order_graph