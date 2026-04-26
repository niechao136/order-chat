from enum import Enum
from pydantic import BaseModel, Field
from typing import List, Optional


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"

class TokenDict(BaseModel):
    id: str = Field(..., description="用户 ID")
    name: str = Field(..., description="用户名")
    role: UserRole = Field(..., description="用户权限")

class UserRegister(BaseModel):
    username: str = Field(..., description="用户 ID")
    email: Optional[str] = Field(default=None, description="用户邮箱")
    password: str = Field(..., description="密码")
    role: UserRole = Field(default=UserRole.USER, description="用户权限")

class UserLogin(BaseModel):
    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")

class ApiKeyEntry(BaseModel):
    key_id: str = Field(..., description="密钥 ID")
    user_id: int = Field(..., description="用户 ID")
    permissions: List[str] = Field(default=[], description="权限列表")
    rate_limit: int = Field(default=0, ge=0, description="每分钟限流，0表示不限")