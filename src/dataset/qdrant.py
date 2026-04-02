import os
from dotenv import load_dotenv

from qdrant_client import AsyncQdrantClient, QdrantClient


load_dotenv()


host = os.getenv("QDRANT_HOST", "localhost")
port = int(os.getenv("QDRANT_PORT", 6333))
grpc = port == 6334
COLLECTION_NAME = os.getenv("QDRANT_NAME", "menu")

_client_async: AsyncQdrantClient | None = None


async def init_qdrant_async():
    global _client_async
    print(f"init_qdrant: {_client_async}")
    _client_async = AsyncQdrantClient(
        host=host,
        port=port,
        prefer_grpc=grpc,
        check_compatibility=False,
        grpc_options={"grpc.enable_retries": 1},
        timeout=60
    )
    print(f"init_qdrant: {_client_async}")


async def close_qdrant_async():
    await _client_async.close()


def get_qdrant_client_async() -> AsyncQdrantClient:
    return _client_async


_client: QdrantClient | None = None


def init_qdrant():
    global _client
    print(f"init_qdrant: {_client}")
    _client = QdrantClient(
        host=host,
        port=port,
        prefer_grpc=grpc,
        check_compatibility=False,
        grpc_options={"grpc.enable_retries": 1},
        timeout=60
    )
    print(f"init_qdrant: {_client}")


def close_qdrant():
    _client.close()


def get_qdrant_client() -> QdrantClient:
    return _client