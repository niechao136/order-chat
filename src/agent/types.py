from enum import Enum
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage
from pydantic import BaseModel, Field
from typing import Annotated, List, Optional
from typing_extensions import TypedDict


class OptionItem(TypedDict):
    name: str
    value: str
    id: str
    price: float
    index: int


class ProductItem(TypedDict):
    id: str
    name: str
    price: float
    quantity: int
    options: List[OptionItem]
    selected: List[OptionItem]


class OrderStatus(Enum):
    ORDERING = "ordering"
    PENDING = "pending"
    CONFIRMING = "confirming"
    COMPLETED = "completed"


class AgentState(TypedDict):
    # 保存对话记录
    messages: Annotated[List[BaseMessage], add_messages]
    # 保存当前购物车内容
    cart: List[ProductItem]
    # 订单状态：ordering, pending, confirming, completed
    order_status: OrderStatus
    # 检索结果缓存
    candidates: Optional[List[ProductItem]]
    # 购物车总价
    total_price: float
    intent: str


class IntentSchema(BaseModel):
    """识别用户的点餐意图"""
    intent: str = Field(description="用户意图：'search' (搜菜), 'update_cart' (增删改), 'checkout' (结算), 'cancel' (取消订单), 'chat' (闲聊)")
    items: Optional[List[str]] = Field(description="提到的菜品名称列表", default=[])
    reasoning: str = Field(description="简短的分类理由")