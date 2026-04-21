from pydantic import BaseModel
from typing import Optional


class ThreadItem(BaseModel):
    thread_id: str
    last_id: str
    summary: str


class ChatReq(BaseModel):
    thread_id: Optional[str] = None
    message: str


class ChatMessage(BaseModel):
    id: str
    content: str
    role: str