from enum import Enum
from pydantic import BaseModel
from typing import List


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"

class TokenDict(BaseModel):
    id: str
    name: str
    role: UserRole

class UserRegister(BaseModel):
    username: str
    email: str | None = None
    password: str
    role: UserRole = UserRole.USER

class UserLogin(BaseModel):
    username: str
    password: str

class ApiKeyEntry(BaseModel):
    key_id: str
    user_id: int
    permissions: List[str]
    rate_limit: int