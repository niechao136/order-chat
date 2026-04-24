from pydantic import BaseModel, Field
from typing import Literal, Optional


class AgentConfig(BaseModel):
    name: str = Field(description="Agent 名称")
    lang: str = Field(description="语言代码，控制 Agent 输出内容的语言")
    dataset: str = Field(description="知识库名称，控制 Agent 检索的知识库")


class ConversationItem(BaseModel):
    conversation_id: str = Field(description="会话 ID")
    last_message_id: str = Field(description="会话最新的消息 ID，用于排序")
    summary: str = Field(description="会话摘要，目前固定为会话的第一条消息")


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = Field(default=None, description="会话 ID，新对话时为 None")
    query: str = Field(description="提问内容")
    lang: Optional[str] = Field(default="zh-TW", description="语言代码，控制 Agent 输出内容的语言")
    dataset: Optional[str] = Field(default="WayFind", description="知识库名称，控制 Agent 检索的知识库")


class MessageItem(BaseModel):
    message_id: str = Field(description="消息 ID")
    content: str = Field(description="消息内容")
    role: Literal["user", "ai"] = Field(description="消息发送者的角色，user - 用户，ai - AI")


class ChatResponse(BaseModel):
    conversation_id: str = Field(description="会话 ID")
    message: MessageItem = Field(description="AI 回复的消息")
