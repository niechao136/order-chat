from typing import List

from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool

from src.dataset.embedding import get_embedding_async
from src.dataset.qdrant import get_qdrant_client, init_qdrant
from src.schemas.find_agent import ProductItem

from .util import format_product


@tool
async def search_product(query: str, top_k: int = 5, config: RunnableConfig = None) -> List[ProductItem]:
    """
    搜索店铺内的商品、价格及营业信息。

    参数:
    - query: 搜索关键词。
    - top_k: 期望返回的结果数量。如果是查询特定商品，建议用 3-5；
             如果是让“推荐一些”、“看看有哪些”，建议设置为 8-10。
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
        query=vector,
        limit=top_k,
        with_payload=True
    )
    print(f"DEBUG: [7] Qdrant 返回了 {len(rows.points)} 条数据")
    return [format_product(o.payload.get("content", "")) for o in rows.points]