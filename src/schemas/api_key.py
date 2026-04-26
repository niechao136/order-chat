from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional

from .page import PageParams


# ---------- 扩展 PageParams，添加字段白名单校验 ----------
class ApiKeyPageParams(PageParams):
    order_by: Optional[str] = Field(default="created_at", description="排序字段")

    @field_validator('order_by')
    @classmethod
    def validate_order_by(cls, v):
        # 允许排序的字段白名单
        allowed_fields = {'created_at', 'last_used_at', 'expires_at', 'name', 'is_active'}
        if v and v not in allowed_fields:
            raise ValueError(f'排序字段必须在 {allowed_fields} 内')
        return v


# ---------- 创建密钥请求 ----------
class CreateApiKeyRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="密钥名称")
    permissions: List[str] = Field(default=[], description="权限列表")
    rate_limit: int = Field(default=0, ge=0, description="每分钟限流，0表示不限")
    expires_at: Optional[datetime] = Field(default=None, description="过期时间（ISO格式）")
    description: Optional[str] = Field(default=None, max_length=500, description="描述")


# ---------- 切换状态请求 ----------
class ToggleApiKeyRequest(BaseModel):
    is_active: bool = Field(..., description="是否启用")


# ---------- 删除密钥请求 ----------
class DeleteApiKeyRequest(BaseModel):
    ids: List[UUID] = Field(..., description="删除密钥的id数组")


# ---------- 响应模型 ----------
class ApiKeyItem(BaseModel):
    id: UUID = Field(..., description="密钥ID")
    name: str = Field(..., min_length=1, max_length=100, description="密钥名称")
    key: str = Field(..., description="密钥内容，用于复制")
    prefix: str = Field(..., description="密钥前缀，用于显示")
    permissions: List[str] = Field(default=[], description="权限列表")
    rate_limit: int = Field(default=0, ge=0, description="每分钟限流，0表示不限")
    created_at: datetime = Field(..., description="创建时间（ISO格式）")
    last_used_at: Optional[datetime] = Field(default=None, description="最后使用时间（ISO格式）")
    expires_at: Optional[datetime] = Field(default=None, description="过期时间（ISO格式）")
    is_active: bool = Field(..., description="是否启用")
    description: Optional[str] = Field(default=None, max_length=500, description="描述")


class ApiKeyCreatedResponse(BaseModel):
    id: UUID = Field(..., description="密钥ID")
    name: str = Field(..., min_length=1, max_length=100, description="密钥名称")
    key: str = Field(..., description="密钥内容，用于复制")
    prefix: str = Field(..., description="密钥前缀，用于显示")
    created_at: datetime = Field(..., description="创建时间")