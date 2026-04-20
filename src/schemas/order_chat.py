from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage
from pydantic import BaseModel, Field
from typing import Annotated, List, Literal


class OptionItem(BaseModel):
    name: str = Field(description="规格分类名称")
    value: str = Field(description="规格名称")
    id: str = Field(description="规格ID")
    price: float = Field(description="规格价格")
    index: int = Field(description="规格分类编号")

class ProductItem(BaseModel):
    id: str = Field(description="商品ID")
    name: str = Field(description="商品名称")
    price: float = Field(description="商品价格")
    quantity: int = Field(description="商品所选数量")
    options: List[OptionItem] = Field(description="商品所有可选规格")
    selected: List[OptionItem] = Field(description="商品所选规格")


class ChangeItem(BaseModel):
    action: Literal["add", "delete"] = Field(description="操作类型，仅包括新增和删除两种")
    product: ProductItem = Field(description="操作涉及的商品")

class ChangeSchema(BaseModel):
    ops: List[ChangeItem] = Field(description="订单操作列表，仅包括新增商品、删除商品两种，修改商品要拆成先删除后新增")


class OutputProduct(BaseModel):
    id: str = Field(description="商品ID")
    name: str = Field(description="商品名称")
    price: float = Field(description="商品价格")
    options: OptionItem = Field(description="商品所选规格")


class OutputSchema(BaseModel):
    AI_reply: str = Field(description="对于用户问题的自然语音回复，要求简洁明了")
    is_finish: bool = Field(description="用户是否确认下单")
    product: List[OutputProduct] = Field(description="订单内容，包括商品ID、名称、价格以及所选规格，每个商品对象只对应1个，用户选择了几个就要加入几个")


class AgentState(BaseModel):
    messages: Annotated[List[BaseMessage], add_messages]
    cart: List[ProductItem]