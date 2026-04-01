import os
from dotenv import load_dotenv

from qdrant_client import AsyncQdrantClient


load_dotenv()


host = os.getenv("QDRANT_HOST", "localhost")
port = int(os.getenv("QDRANT_PORT", 6333))
grpc = port == 6334
COLLECTION_NAME = os.getenv("QDRANT_NAME", "menu")

_client: AsyncQdrantClient | None = None


async def init_qdrant():
    global _client
    _client = AsyncQdrantClient(
        host=host,
        port=port,
        prefer_grpc=grpc,
        check_compatibility=False,
        grpc_options={"grpc.enable_retries": 1}
    )


async def close_qdrant():
    await _client.close()


def get_qdrant_client() -> AsyncQdrantClient:
    return _client