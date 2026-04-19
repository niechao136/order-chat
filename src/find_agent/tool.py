from typing import List, Any, cast, Optional

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from qdrant_client.models import Filter, FieldCondition, Range

from src.dataset.embedding import get_embedding_async
from src.dataset.qdrant import get_qdrant_client, init_qdrant
from src.schemas.find_agent import ProductItem

from .util import format_product


@tool
async def search_product(
    query: str,
    top_k: int,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    config: RunnableConfig = None
) -> List[ProductItem]:
    """
    当你认为当前信息不足以回答用户，需要搜索商品信息时，调用此工具。

    参数:
    - query: 搜索关键词。
    - top_k: [重要] 请严格根据意图二选一：
        - 设为 3: 用户寻找“特定”目标（如：指名道姓问某个商品、问价格）。
        - 设为 10: 用户寻找“一组”目标（如：要求推荐、问有哪些、看所有的、意图模糊）。
    - min_price: (可选) 最低价格限制，用于筛选结果。
    - max_price: (可选) 最高价格限制，用于筛选结果。
    """
    print(f"调用 search_product 工具, query: {query}, top_k: {top_k}, min_price: {min_price}, max_price: {max_price}")

    configurable = config.get("configurable", {})
    collection_name = configurable.get("collection_name", "WayFind")

    # top_k 边界处理
    if not top_k or top_k > 10:
        top_k = 10
    if top_k < 3:
        top_k = 3

    client = get_qdrant_client()
    if not client:
        init_qdrant()
        client = get_qdrant_client()

    vector = await get_embedding_async(text=query)

    # 构建价格过滤条件
    filter_obj = None
    if min_price is not None or max_price is not None:
        range_kwargs = {}
        if min_price is not None:
            range_kwargs["gte"] = min_price
        if max_price is not None:
            range_kwargs["lte"] = max_price
        filter_obj = Filter(
            must=[FieldCondition(key="price", range=Range(**range_kwargs))]
        )

    rows = client.query_points(
        collection_name=collection_name,
        query=cast(Any, vector),
        limit=top_k,
        with_payload=True,
        query_filter=filter_obj
    )
    return [format_product(o.payload.get("content", "")) for o in rows.points]


@tool
async def complete_task():
    """
    当你认为已经获取了足够信息，不需要再查询产品即可回答用户时，调用此工具。
    """
    return "已准备好进行最终格式化"