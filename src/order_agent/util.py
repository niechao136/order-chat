import re
from typing import List

from src.schemas.order_chat import ProductItem, OptionItem


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
                index=favor_key
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