from langchain_core.messages import SystemMessage
from langgraph.graph import StateGraph, START, END

from .llm import base, intent_llm
from .prompt import CHAT_PROMPT, INTENT_PROMPT
from .types import AgentState


async def intent_node(state: AgentState):
    sys_msg = SystemMessage(content=INTENT_PROMPT)
    prompt = [sys_msg] + state["messages"]
    response = await intent_llm.ainvoke(prompt)
    return { "intent": response.intent }


async def chat_node(state: AgentState):
    sys_msg = SystemMessage(content=CHAT_PROMPT)
    prompt = [sys_msg] + state["messages"]
    response = await base.ainvoke(prompt)
    return {"messages": [response]}


def route_tools(state: AgentState):
    intent = state.get("intent")
    if intent == "chat":
        return "chat"
    else:
        return END


graph_builder = StateGraph(AgentState)
graph_builder.add_node("intent", intent_node)
graph_builder.add_node("chat", chat_node)
graph_builder.add_edge(START, "intent")
graph_builder.add_conditional_edges("intent", route_tools, {"chat": "chat", END: END})
graph_builder.add_edge("chat", END)
graph = graph_builder.compile()