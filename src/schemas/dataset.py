from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal


class AddDatasetRequest(BaseModel):
    name: str = Field(description="知识库名称")


class AddPointRequest(BaseModel):
    content: str = Field(description="用于生成向量的文本内容")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="向量数据绑定的元数据")


class UpdatePointRequest(BaseModel):
    content: str = Field(description="用于生成向量的文本内容")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="向量数据绑定的元数据")


class GetPointsRequest(BaseModel):
    ids: List[str] = Field(description="向量数据的 ID 数组")


class DeletePointsRequest(BaseModel):
    ids: List[str] = Field(description="向量数据的 ID 数组")


class FilterCondition(BaseModel):
    field: str = Field(description="筛选条件的栏位")
    operator: str = Field(description="筛选条件的操作符")  # eq, ne, gt, gte, lt, lte, in, nin, like, etc.
    value: Any = Field(description="筛选条件的值")


class SearchPointRequest(BaseModel):
    text: str = Field(description="搜索的文本")
    top_k: int = Field(10, ge=1, description="返回的结果个数")
    filters: Optional[List[FilterCondition]] = Field(default_factory=list, description="筛选条件数组，筛选条件由栏位、操作符、值组成")


class FieldItem(BaseModel):
    field_name: str = Field(description="字段名称")
    field_type: Literal["string", "number", "boolean", "array", "object"] = Field(description="字段数据类型")
    is_required: bool = Field(default=False, description="字段是否必填")
    default_value: Optional[Any] = Field(default=None, description="字段默认值")
    description: Optional[str] = Field(default=None, description="字段描述")