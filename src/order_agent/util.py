import re
from typing import List

from src.schemas.order_chat import ProductItem, OptionItem, OperatorSchema


def format_product(content: str) -> ProductItem:
    lines = content.strip().split('\n')
    data = {}

    # 1. 解析基本键值对
    for line in lines:
        if ':' not in line:
            continue
        key, value = line.split(':', 1)
        key = key.strip()
        value = value.strip()
        data[key] = value

    # 2. 提取基础字段
    prod_id = data.get('prod_id', '')
    prod_name = data.get('prod_name', '')
    try:
        price = float(data.get('price', 0))
    except ValueError:
        price = 0.0

    # 3. 解析所有 favor 字段为 options
    options: List[OptionItem] = []
    favor_keys = sorted([k for k in data.keys() if k.startswith('favor')],
                        key=lambda x: int(x.replace('favor', '')) if x.replace('favor', '').isdigit() else 999)

    for favor_key in favor_keys:
        index = int(favor_key.replace('favor', ''))
        favor_value = data[favor_key]
        # 格式示例: "熟度:[id1:全熟:0;id2:七分熟:0]"
        # 使用正则提取组名和选项内容
        match = re.match(r'([^:]+):\[(.*)]', favor_value)
        if not match:
            continue

        group_name = match.group(1).strip()  # 选项组名，如"熟度"
        items_str = match.group(2)  # 内部选项字符串，如"id1:全熟:0;id2:七分熟:0"

        # 分割每个选项
        item_parts = items_str.split(';')
        for idx, part in enumerate(item_parts):
            part = part.strip()
            if not part:
                continue
            # 每个选项格式: "id1:全熟:0"
            sub_parts = part.split(':')
            if len(sub_parts) < 3:
                continue
            opt_id = sub_parts[0].strip()
            opt_value = sub_parts[1].strip()
            try:
                opt_price = float(sub_parts[2].strip())
            except ValueError:
                opt_price = 0.0

            option_item = OptionItem(
                name=group_name,
                value=opt_value,
                id=opt_id,
                price=opt_price,
                index=index
            )
            options.append(option_item)

    # 4. 构建 ProductItem（quantity 未提供，默认为 1；selected 初始为空列表）
    product = ProductItem(
        id=prod_id,
        name=prod_name,
        price=price,
        quantity=0,
        options=options,
        selected=[]
    )

    return product


def selected_equal(sel1: List[OptionItem], sel2: List[OptionItem]) -> bool:
    """比较两个 selected 列表是否包含相同规格（基于 ID 集合）"""
    ids1 = {opt.id for opt in sel1}
    ids2 = {opt.id for opt in sel2}
    return ids1 == ids2


def update_cart(old_cart: List[ProductItem], ops: OperatorSchema) -> List[ProductItem]:
    new_cart = [item.model_copy(deep=True) for item in old_cart]  # 深拷贝避免副作用

    for change_item in ops.ops:
        action = change_item.action
        product = change_item.product

        if action == "add":
            # 查找是否已存在相同商品（ID 相同且 selected 规格组合相同）
            matched = False
            for cart_item in new_cart:
                if cart_item.id == product.id and selected_equal(cart_item.selected, product.selected):
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
                if not (item.id == product.id and selected_equal(item.selected, product.selected))
            ]

    return new_cart