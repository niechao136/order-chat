from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage
from pydantic import BaseModel
from typing import Annotated, List


class AgentState(BaseModel):
    messages: Annotated[List[BaseMessage], add_messages]


class ProductItem(BaseModel):
    id: str
    name: str
    price: float
    store: str
    time: str
    space_id: str
    space: str
    child_space_id: str
