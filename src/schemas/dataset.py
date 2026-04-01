from pydantic import BaseModel, Field
from typing import List


class CollectionAdd(BaseModel):
    name: str


class ItemAdd(BaseModel):
    text: str


class ItemUpdate(BaseModel):
    text: str


class ItemDelete(BaseModel):
    ids: List[str]


class ItemSearch(BaseModel):
    text: str
    top_k: int = Field(10, ge=1, description="返回的结果个数")