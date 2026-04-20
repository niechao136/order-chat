from typing import List, Any, cast

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from src.dataset.embedding import get_embedding_async
from src.dataset.qdrant import get_qdrant_client, init_qdrant
from src.schemas.order_chat import ProductItem

from .util import format_product


@tool
async def search_product(
    query: str,
    top_k: int,
    config: RunnableConfig = None
) -> List[ProductItem]:
    """
    当你认为当前信息不足以回答用户，需要搜索商品信息时，调用此工具。

    参数:
    - query: 搜索关键词。
    - top_k: [重要] 请严格根据意图二选一：
        - 设为 3: 用户寻找“特定”目标（如：指名道姓问某个商品、问价格）。
        - 设为 10: 用户寻找“一组”目标（如：要求推荐、问有哪些、看所有的、意图模糊）。
    """
    print(f"调用 search_product 工具, query: {query}, top_k: {top_k}")

    configurable = config.get("configurable", {})
    collection_name = configurable.get("collection_name", "Order")

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

    rows = client.query_points(
        collection_name=collection_name,
        query=cast(Any, vector),
        limit=top_k,
        with_payload=True
    )
    return [format_product(o.payload.get("content", "")) for o in rows.points]


@tool
async def no_search():
    """
    当你认为已经获取了足够信息，不需要再查询产品即可回答用户时，调用此工具。
    """
    return "无需搜索商品信息"