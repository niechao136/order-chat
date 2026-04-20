from typing import List, Any, cast

from langchain_core.messages import ToolMessage
from langchain_core.runnables import RunnableConfig
from langchain_core.tools import tool
from langgraph.types import Command

from src.dataset.embedding import get_embedding_async
from src.dataset.qdrant import get_qdrant_client, init_qdrant
from src.schemas.order_chat import ProductItem, ChangeSchema, OptionItem

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


@tool
async def change_cart(
        ops: ChangeSchema,
        config: RunnableConfig = None
):
    """
    操作订单（新增/删除商品）。修改操作需先删除旧商品，再新增新商品。

    参数:
    - ops: 包含操作列表的 ChangeSchema 对象。
    """
    print(f"调用 change_cart 工具, ops: {ops.model_dump_json(indent=2)}")

    def _selected_equal(sel1: List[OptionItem], sel2: List[OptionItem]) -> bool:
        """比较两个 selected 列表是否包含相同规格（基于 ID 集合）"""
        ids1 = {opt.id for opt in sel1}
        ids2 = {opt.id for opt in sel2}
        return ids1 == ids2

    def update_cart(old_cart: List[ProductItem]) -> List[ProductItem]:
        new_cart = [item.model_copy(deep=True) for item in old_cart]  # 深拷贝避免副作用

        for change_item in ops.ops:
            action = change_item.action
            product = change_item.product

            if action == "add":
                # 查找是否已存在相同商品（ID 相同且 selected 规格组合相同）
                matched = False
                for cart_item in new_cart:
                    if cart_item.id == product.id and _selected_equal(cart_item.selected, product.selected):
                        # 规格组合相同，合并数量
                        cart_item.quantity += product.quantity
                        matched = True
                        break
                if not matched:
                    # 直接新增
                    new_cart.append(product.model_copy(deep=True))

            elif action == "delete":
                # 移除匹配 ID 且 selected 相同的商品
                new_cart = [
                    item for item in new_cart
                    if not (item.id == product.id and _selected_equal(item.selected, product.selected))
                ]

        return new_cart

    def _summarize_ops(op: ChangeSchema) -> str:
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