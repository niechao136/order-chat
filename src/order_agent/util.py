import re
from collections import defaultdict
from typing import List

from src.schemas.order_chat import OrderProduct, OptionItem, OperatorSchema


def format_product(content: str) -> OrderProduct:
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
    product = OrderProduct(
        id=prod_id,
        name=prod_name,
        price=price,
        quantity=0,
        options=options,
        selected=[]
    )

    return product


def get_default_selected(options: List[OptionItem]) -> List[OptionItem]:
    """
    从商品的所有可选规格中，为每个规格分类选择默认选项：
    - 优先选择价格为0的选项
    - 若同分类有多个价格为0的选项，取 index 最小的
    - 若同分类没有价格为0的选项，取 index 最小的
    """
    groups = defaultdict(list)
    for opt in options:
        groups[opt.name].append(opt)

    default_selected = []
    for group_name, opts in groups.items():
        # 筛选价格为0的选项
        zero_opts = [opt for opt in opts if opt.price == 0]
        if zero_opts:
            # 按 index 升序取第一个
            zero_opts.sort(key=lambda x: x.index)
            default_selected.append(zero_opts[0])
        else:
            # 无0价格选项，取 index 最小的
            opts.sort(key=lambda x: x.index)
            default_selected.append(opts[0])
    return default_selected


def fill_missing_defaults(options: List[OptionItem], selected: List[OptionItem]) -> List[OptionItem]:
    """若 selected 未覆盖所有规格分类，补全缺失分类的默认选项"""
    # 按规格名分组
    groups = defaultdict(list)
    for opt in options:
        groups[opt.name].append(opt)

    # 已选中的规格名集合
    selected_names = {sel.name for sel in selected}
    all_names = set(groups.keys())
    missing_names = all_names - selected_names

    # 补全缺失的规格
    completed = list(selected)  # 浅拷贝，后续修改不影响原对象
    for name in missing_names:
        opts = groups[name]
        zero_opts = [opt for opt in opts if opt.price == 0]
        if zero_opts:
            default_opt = min(zero_opts, key=lambda x: x.index)
        else:
            default_opt = min(opts, key=lambda x: x.index)
        completed.append(default_opt)

    return completed


def selected_equal(sel1: List[OptionItem], sel2: List[OptionItem]) -> bool:
    """比较两个 selected 列表是否包含相同规格（基于 ID 集合）"""
    ids1 = {opt.id for opt in sel1}
    ids2 = {opt.id for opt in sel2}
    return ids1 == ids2


def selected_contains(item_selected: List[OptionItem], target_selected: List[OptionItem]) -> bool:
    """检查 item_selected 是否包含 target_selected 中的所有规格（基于ID）"""
    item_ids = {opt.id for opt in item_selected}
    target_ids = {opt.id for opt in target_selected}
    return target_ids.issubset(item_ids)


def update_cart(old_cart: List[dict], ops: OperatorSchema) -> List[dict]:
    new_cart = [OrderProduct(**item) for item in old_cart]

    for change_item in ops.ops:
        action = change_item.action
        product = change_item.product

        if action == "add":
            # 查找是否已存在相同商品（ID 相同且 selected 规格组合相同）
            matched = False
            product.quantity = max(product.quantity, 1)
            if not product.selected:
                # 若 selected 为空，直接使用全默认规格
                product.selected = get_default_selected(product.options)
            else:
                # 若 selected 非空但未包含全部规格，则补全缺失分类
                product.selected = fill_missing_defaults(product.options, product.selected)
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
            # 默认删除数量：若未指定或 ≤0，则删除所有匹配条目的全部数量
            qty_to_delete = product.quantity if product.quantity and product.quantity > 0 else None

            # 找出所有候选条目
            candidates = []
            for idx, item in enumerate(new_cart):
                if item.id != product.id:
                    continue
                if product.selected:
                    # 必须满足：item.selected 包含 product.selected 中的所有规格
                    if selected_contains(item.selected, product.selected):
                        candidates.append((idx, item))
                else:
                    # 未指定规格，所有该ID条目均为候选
                    candidates.append((idx, item))

            if qty_to_delete is None:
                # 删除所有匹配条目
                for idx, _ in candidates:
                    new_cart[idx] = None
            else:
                remaining = qty_to_delete
                # 按数量降序，优先扣减数量多的条目
                candidates.sort(key=lambda x: x[1].quantity, reverse=True)
                for idx, item in candidates:
                    if remaining <= 0:
                        break
                    if item.quantity <= remaining:
                        remaining -= item.quantity
                        new_cart[idx] = None
                    else:
                        item.quantity -= remaining
                        remaining = 0

            # 移除标记为 None 的条目
            new_cart = [item for item in new_cart if item is not None]

    return [item.model_dump() for item in new_cart]