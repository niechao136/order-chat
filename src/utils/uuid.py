import os
import uuid


def generate_timestamp_uuid(ms_timestamp: int):
    # 生成随机字节
    rand_bytes = os.urandom(10)

    # 拼接并处理符合 RFC 规范的位
    # 强制设置版本号为 7 (UUIDv7)
    # 格式：前48位时间戳 | 4位版本(0111) | 后续随机位
    # 这里为了简单演示，我们直接利用 Python uuid 模块来包装

    # 构造一个 16 字节的 bytearray
    b = bytearray(ms_timestamp.to_bytes(6, 'big') + rand_bytes)

    # 设置版本号 (Version 7: 0111xxxx)
    b[6] = (b[6] & 0x0f) | 0x70
    # 设置变体号 (Variant: 10xxxxxx)
    b[8] = (b[8] & 0x3f) | 0x80

    return uuid.UUID(bytes=bytes(b))