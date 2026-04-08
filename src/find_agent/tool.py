from typing import List, Any, cast

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from src.dataset.embedding import get_embedding_async
from src.dataset.qdrant import get_qdrant_client, init_qdrant
from src.schemas.find_agent import ProductItem

from .util import format_product


@tool
async def search_product(query: str, top_k: int = 5, config: RunnableConfig = None) -> List[ProductItem]:
    """
    当你认为当前信息不足以回答用户，需要搜索商品信息时，调用此工具。

    参数:
    - query: 搜索关键词。
    - top_k: 【关键参数】请根据用户意图动态调整：
        1. 如果用户询问特定的一两个商品，请设为 3。
        2. 如果用户要求“多推荐几个”、“看看有哪些”或意图模糊，请务必设为 10。
        3. 默认情况请设为 5。
    """
    configurable = config.get("configurable", {})
    collection_name = configurable.get("collection_name", "WayFind")

    if top_k < 3:
        top_k = 3
    if top_k > 10:
        top_k = 10

    client = get_qdrant_client()
    if not client:
        init_qdrant()
        client = get_qdrant_client()

    print("DEBUG: [3] 获取到 Qdrant Client")
    print(f"DEBUG: [4] 开始计算向量, Query: {query}")
    vector = await get_embedding_async(text=query)
    print("DEBUG: [5] 向量计算完成")
    print(f"DEBUG: [6] 开始请求 Qdrant query_points，collection_name={collection_name}")
    rows = client.query_points(
        collection_name=collection_name,
        query=cast(Any, vector),
        limit=top_k,
        with_payload=True
    )
    print(f"DEBUG: [7] Qdrant 返回了 {len(rows.points)} 条数据")
    return [format_product(o.payload.get("content", "")) for o in rows.points]


@tool
async def complete_task():
    """
    当你认为已经获取了足够信息，不需要再查询产品即可回答用户时，调用此工具。
    """
    return "已准备好进行最终格式化"