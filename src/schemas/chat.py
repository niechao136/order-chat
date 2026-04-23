from pydantic import BaseModel, Field
from typing import Optional


class GraphConfig(BaseModel):
    name: str
    lang: str
    collection_name: str


class ThreadItem(BaseModel):
    thread_id: str
    last_id: str
    summary: str


class ChatReq(BaseModel):
    thread_id: Optional[str] = None
    message: str
    lang: Optional[str] = Field(default="zh-TW", description="语言代码")
    collection_name: Optional[str] = Field(default="WayFind", description="检索的集合名称")


class ChatMessage(BaseModel):
    id: str
    content: str
    role: str