import secrets
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def generate_api_key() -> tuple[str, str, str]:
    """返回 (明文密钥, 哈希值, 前缀)"""
    plain_key = secrets.token_hex(32)           # 64字符 hex
    key_hash = pwd_context.hash(plain_key)
    prefix = plain_key[:8]
    return plain_key, key_hash, prefix

def verify_api_key(plain_key: str, key_hash: str) -> bool:
    try:
        return pwd_context.verify(plain_key, key_hash)
    except Exception:
        return False