from enum import Enum
from pydantic import BaseModel


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


class TokenDict(BaseModel):
    id: str
    name: str
    role: UserRole