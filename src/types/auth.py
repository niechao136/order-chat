from enum import Enum
from pydantic import BaseModel
from typing import Union


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

class TokenSuccessResponse(BaseModel):
    status: int = 1
    access_token: str
    role: UserRole

class TokenErrorResponse(BaseModel):
    status: int = 0
    error_msg: str

TokenResponse = Union[TokenSuccessResponse, TokenErrorResponse]