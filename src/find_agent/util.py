from src.schemas.find_agent import ProductItem


def format_product(content: str) -> ProductItem:
    lines = [line.strip() for line in content.splitlines() if ":" in line]

    data = {}
    for line in lines:
        # 使用 maxsplit=1 是為了防止內容中也包含冒號（例如時間 00:00）
        key, value = line.split(":", 1)
        data[key.strip()] = value.strip()

    num: int | None = None
    stock = data.get("stock", None)
    if stock:
        num = int(str(stock))

    return ProductItem(
        id=data.get("product_id", ""),
        name=data.get("name", ""),
        price=float(data.get("price", 0)),
        descr=data.get("description", ""),
        stock=num,
        store=data.get("store_name", ""),
        time=data.get("store_time", ""),
        space_id=data.get("space_id", ""),
        space=data.get("space_name", ""),
        child_space_id=data.get("child_space_id", "")
    )