from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage
from pydantic import BaseModel, Field
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


class OutputProduct(BaseModel):
    id: str = Field(description="商品ID")
    name: str = Field(description="商品名称")
    price: float = Field(description="商品价格")

class OutputStore(BaseModel):
    name: str = Field(description="门店名称")
    child_space_id: str = Field(description="门店ID")
    space_id: str = Field(description="分区ID")
    space: str = Field(description="分区名称")
    time: str = Field(description="营业时间")
    product: List[OutputProduct] = Field(description="商品信息")

class OutputSchema(BaseModel):
    AI_reply: str = Field(description="对于用户问题的自然语音回复，要求简洁明了")
    info: List[OutputStore] = Field(description="回答相关门店信息，必须从 search_product 返回结果中提取，严重修改或者编造")
