from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal


class CollectionAdd(BaseModel):
    name: str


class ItemAdd(BaseModel):
    content: str
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ItemUpdate(BaseModel):
    content: str
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ItemDelete(BaseModel):
    ids: List[str]


class FilterCondition(BaseModel):
    field: str
    operator: str  # eq, ne, gt, gte, lt, lte, in, nin, like, etc.
    value: Any


class ItemSearch(BaseModel):
    text: str
    top_k: int = Field(10, ge=1, description="返回的结果个数")
    filters: Optional[List[FilterCondition]] = Field(default_factory=list)


class FieldItem(BaseModel):
    field_name: str
    field_type: Literal["string", "number", "boolean", "array", "object"]
    is_required: bool = False
    default_value: Optional[Any] = None
    description: Optional[str] = None