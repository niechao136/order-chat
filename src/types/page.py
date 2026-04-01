from typing import Optional, Literal, List, TypeVar, Generic
from pydantic import BaseModel, Field


class PageParams(BaseModel):
    # --- 分页 ---
    page: int = Field(1, ge=1, description="当前页码")
    size: int = Field(10, ge=1, le=100, description="每页条数")

    # --- 排序 ---
    order_by: Optional[str] = Field(None, description="排序字段，如 'created_at'")
    direction: Literal["asc", "desc"] = Field("desc", description="排序方向")

    # --- 搜索 ---
    keyword: Optional[str] = Field(None, description="全文搜索关键词")

    @property
    def offset(self) -> int:
        """计算 SQL 的 OFFSET"""
        return (self.page - 1) * self.size


T = TypeVar("T")

class PageResult(BaseModel, Generic[T]):
    total: int = Field(..., description="总记录数")
    data: List[T] = Field(..., description="当前页数据列表")
    page: int
    size: int


class DataResult(BaseModel, Generic[T]):
    data: Optional[T] = Field(None, description="某项数据具体信息")
    status: Literal[1, 0] = Field(0, description="状态码")
    msg: Optional[str] = Field(None, description="错误信息")