import hashlib
import uuid

from fastapi import APIRouter, Depends, HTTPException
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models

from ..dataset.embedding import get_embedding_async
from ..dataset.qdrant import get_qdrant_client, COLLECTION_NAME


admin_router = APIRouter(prefix="/admin", tags=["Qdrant Management"])


@admin_router.post("/init")
async def init_qdrant(client: AsyncQdrantClient = Depends(get_qdrant_client)):
    try:
        await client.collection_exists(collection_name=COLLECTION_NAME)
        return {"status": 200, "message": f"Collection '{COLLECTION_NAME}' created."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@admin_router.post("/upsert")
async def upsert_item(text: str, menu_id: str = None, client: AsyncQdrantClient = Depends(get_qdrant_client)):
    vector = await get_embedding_async(text=text)
    key = menu_id or hashlib.md5(text.encode()).hexdigest()
    uu_id = uuid.UUID(key)

    await client.upsert(collection_name=COLLECTION_NAME, points=[
        models.PointStruct(id=uu_id, vector=vector, payload={ "content": text })
    ])
    return {"status": 200, "data": uu_id}


@admin_router.post("/search")
async def search_item(text: str, top_k = 10, client: AsyncQdrantClient = Depends(get_qdrant_client)):
    vector = await get_embedding_async(text=text)

    results = await client.query_points(
        collection_name=COLLECTION_NAME,
        query_vector=vector,
        limit=top_k,
        with_payload=True
    )

    data = [
        {
            "id": r.id,
            "score": r.score,
            "content": r.payload.get("content") if r.payload else None
        } for r in results.points
    ]
    return {"status": 200, "data": data}