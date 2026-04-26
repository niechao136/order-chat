import os
from dotenv import load_dotenv

from qdrant_client import AsyncQdrantClient, QdrantClient


load_dotenv()


host = os.getenv("QDRANT_HOST", "localhost")
port = int(os.getenv("QDRANT_PORT", 6333))
grpc = port == 6334

_client_async: AsyncQdrantClient | None = None


def init_qdrant_async():
    global _client_async
    print(f"init_qdrant: {_client_async}")

    if _client_async is not None:
        return _client_async

    client_async = AsyncQdrantClient(
        host=host,
        port=port,
        prefer_grpc=grpc,
        check_compatibility=False,
        grpc_options={"grpc.enable_retries": 1},
        timeout=60
    )
    _client_async = client_async
    print(f"init_qdrant: {_client_async}")
    return client_async


async def close_qdrant_async():
    if _client_async is not None:
        await _client_async.close()


def get_qdrant_client_async() -> AsyncQdrantClient:
    if _client_async is None:
        return init_qdrant_async()
    return _client_async


_client: QdrantClient | None = None


def init_qdrant():
    global _client
    print(f"init_qdrant: {_client}")

    if _client is not None:
        return _client

    client = QdrantClient(
        host=host,
        port=port,
        prefer_grpc=grpc,
        check_compatibility=False,
        grpc_options={"grpc.enable_retries": 1},
        timeout=60
    )
    _client = client
    print(f"init_qdrant: {_client}")
    return client


def close_qdrant():
    if _client is not None:
        _client.close()


def get_qdrant_client() -> QdrantClient:
    if _client is None:
        return init_qdrant()
    return _client