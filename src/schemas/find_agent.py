from enum import Enum
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage
from pydantic import BaseModel, Field
from typing import Annotated, List


class AgentState(BaseModel):
    messages: Annotated[List[BaseMessage], add_messages]


class ProductItem(BaseModel):
    id: str = Field(description="商品ID")
    name: str = Field(description="商品名称")
    price: float = Field(description="商品价格")
    descr: str = Field(description="商品描述")
    store: str = Field(description="门店名称")
    child_space_id: str = Field(description="门店ID")
    space_id: str = Field(description="分区ID")
    space: str = Field(description="分区名称")
    time: str = Field(description="营业时间")


class ProductIndex(str, Enum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"
    E = "E"
    F = "F"
    G = "G"
    H = "H"
    I = "I"
    J = "J"
    K = "K"
    L = "L"
    M = "M"
    N = "N"
    O = "O"
    P = "P"
    Q = "Q"
    R = "R"
    S = "S"
    T = "T"
    U = "U"
    V = "V"
    W = "W"
    X = "X"
    Y = "Y"
    Z = "Z"


class OutputProduct(BaseModel):
    id: str = Field(description="商品ID")
    name: str = Field(description="商品名称")
    price: float = Field(description="商品价格")
    descr: str = Field(description="商品描述")
    ai_analysis: str = Field(description="商品AI分析")
    index: ProductIndex = Field(description="商品序号，从A开始，严禁重复")

class OutputStore(BaseModel):
    name: str = Field(description="门店名称")
    child_space_id: str = Field(description="门店ID")
    space_id: str = Field(description="分区ID")
    space: str = Field(description="分区名称")
    time: str = Field(description="营业时间")
    product: List[OutputProduct] = Field(description="商品信息")

class OutputSchema(BaseModel):
    AI_reply: str = Field(description="对于用户问题的自然语音回复，要求简洁明了")
    info: List[OutputStore] = Field(description="回复中提及的商品信息，必须从 search_product 返回结果中提取，严重修改或者编造")
