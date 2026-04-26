from datetime import datetime
from pydantic import BaseModel, Field
from typing import Optional, List

from .auth import UserRole


class UserInfo(BaseModel):
    id: str = Field(..., description="用户 ID")
    username: str = Field(..., description="用户名")
    email: Optional[str] = Field(default=None, description="用户邮箱")
    role: UserRole = Field(..., description="用户权限")
    created_at: datetime = Field(..., description="创建时间（ISO格式）")
    updated_at: datetime = Field(..., description="更新时间（ISO格式）")


class UserAdd(BaseModel):
    username: str = Field(..., description="用户 ID")
    email: Optional[str] = Field(default=None, description="用户邮箱")
    password: str = Field(..., description="密码")
    role: UserRole = Field(..., description="用户权限")


class UserUpdate(BaseModel):
    username: str = Field(..., description="用户 ID")
    email: Optional[str] = Field(default=None, description="用户邮箱")
    role: UserRole = Field(..., description="用户权限")


class UserPassword(BaseModel):
    password: str = Field(..., description="密码")


class UserDel(BaseModel):
    ids: List[str] = Field(description="用户 ID 数组")