from pydantic import BaseModel


class ThreadItem(BaseModel):
    thread_id: str
    last_id: str
    summary: str


class ChatReq(BaseModel):
    message: str

class ChatMessage(BaseModel):
    id: str
    content: str
    role: str