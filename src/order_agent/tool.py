from typing import List, Any, cast

from langchain_core.messages import ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from langgraph.types import Command

from src.dataset.embedding import get_embedding_async
from src.dataset.qdrant import get_qdrant_client, init_qdrant
from src.schemas.order_chat import OrderProduct, OperatorSchema

from .util import format_product, update_cart


@tool
async def search_product(
    query: str,
    top_k: int,
    config: RunnableConfig = None
) -> List[OrderProduct]:
    """
    当你认为当前信息不足以回答用户，需要搜索商品信息时，调用此工具。

    参数:
    - query: 搜索关键词。
    - top_k: [重要] 请严格根据意图二选一：
        - 设为 3: 用户寻找“特定”目标（如：指名道姓问某个商品、问价格）。
        - 设为 10: 用户寻找“一组”目标（如：要求推荐、问有哪些、看所有的、意图模糊）。
    """
    print(f"调用 search_product 工具, query: {query}, top_k: {top_k}")

    configurable = config.get("configurable", {}) if config else {}
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
    return [format_product(o.payload.get("content", "") if o.payload else "") for o in rows.points]


@tool
async def no_search():
    """
    当你认为已经获取了足够信息，不需要再查询产品即可回答用户时，调用此工具。
    """
    return "无需搜索商品信息"


@tool
async def change_cart(
        ops: OperatorSchema,
        config: RunnableConfig = None
):
    """
    操作订单（新增/删除商品）。修改操作需先删除旧商品，再新增新商品。

    参数:
    - ops: 包含操作列表的 OperatorSchema 对象。
    """
    print(f"调用 change_cart 工具, ops: {ops.model_dump_json(indent=2)}")

    def _summarize_ops(op: OperatorSchema) -> str:
        adds = []
        deletes = []
        for item in op.ops:
            prod = item.product
            spec = f"({','.join(opt.value for opt in prod.selected)})" if prod.selected else ""
            if item.action == "add":
                adds.append(f"{prod.name}{spec} x{prod.quantity}")
            else:
                deletes.append(f"{prod.name}{spec}")
        msgs = []
        if adds:
            msgs.append(f"已添加: {', '.join(adds)}")
        if deletes:
            msgs.append(f"已移除: {', '.join(deletes)}")
        return "; ".join(msgs) if msgs else "订单无变化"

    # 生成工具执行结果描述
    summary = _summarize_ops(ops)

    # 关键：从 config 中获取 tool_call_id
    tool_call_id = config.get("configurable", {}).get("tool_call_id") if config else None

    return Command(
        update={
            "cart": update_cart,
            "messages": [ToolMessage(content=summary, tool_call_id=tool_call_id)]
        }
    )


@tool
async def no_change():
    """
    当你认为不需要操作订单时，调用此工具。
    """
    return "无需修改订单"