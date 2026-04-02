from typing import Optional, Literal, List, TypeVar, Generic
from pydantic import BaseModel, Field


class ThreadItem(BaseModel):
    thread_id: str
    last_id: str
    summary: str


class ChatReq(BaseModel):
    message: str