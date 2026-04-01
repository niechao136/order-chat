from datetime import datetime
from pydantic import BaseModel
from typing import Optional

from .auth import UserRole


class UserInfo(BaseModel):
    id: str
    username: str
    email: Optional[str] = None
    role: UserRole
    created_at: datetime
    updated_at: datetime


class UserAdd(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    role: UserRole


class UserUpdate(BaseModel):
    email: Optional[str] = None
    role: UserRole


class UserPassword(BaseModel):
    password: str