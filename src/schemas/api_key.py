from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field
from typing import List, Optional


# ---------- 创建密钥请求 ----------
class CreateApiKeyRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="密钥名称")
    permissions: List[str] = Field(default=[], description="权限列表")
    rate_limit: int = Field(default=0, ge=0, description="每分钟限流，0表示不限")
    expires_at: Optional[datetime] = Field(None, description="过期时间（ISO格式）")
    description: Optional[str] = Field(None, max_length=500, description="描述")


# ---------- 切换状态请求 ----------
class ToggleApiKeyRequest(BaseModel):
    is_active: bool = Field(..., description="是否启用")


# ---------- 响应模型 ----------
class ApiKeyItem(BaseModel):
    id: UUID
    name: str
    key: str
    prefix: str
    permissions: List[str]
    rate_limit: int
    created_at: datetime
    last_used_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool
    description: Optional[str] = None


class ApiKeyCreatedResponse(BaseModel):
    id: UUID
    name: str
    key: str
    prefix: str
    created_at: datetime