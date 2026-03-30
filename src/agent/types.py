from typing import Annotated, TypedDict, List
from enum import Enum
from langgraph.graph.message import add_messages


class OptionItem(TypedDict):
    name: str
    value: str
    id: str
    price: float
    index: int


class ProductItem(TypedDict):
    id: str
    name: str
    price: str
    option: List[OptionItem]


class OrderStatus(Enum):
    ORDERING = "ordering"
    CONFIRMING = "confirming"
    COMPLETED = "completed"


class AgentState(TypedDict):
    # 保存对话记录
    messages: Annotated[List, add_messages]
    # 保存当前购物车内容
    cart: List[ProductItem]
    # 订单状态：ordering, confirming, completed
    order_status: OrderStatus