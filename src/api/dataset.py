import hashlib
import uuid
import re
from typing import List

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models
from qdrant_client.models import CollectionDescription, CollectionInfo, ScoredPoint, Record, PointStruct

from src.dataset.embedding import get_embedding_async, get_embeddings_async_batch
from src.dataset.qdrant import get_qdrant_client
from src.schemas.dataset import CollectionAdd, ItemSearch, ItemAdd, ItemUpdate, ItemDelete
from src.schemas.page import NoPageResult, DataResult, PageResult, PageParams
from src.utils.jwt import get_current_admin


dataset_router = APIRouter(prefix="/dataset", tags=["Dataset"], dependencies=[Depends(get_current_admin)])


@dataset_router.get("/", response_model=NoPageResult[CollectionDescription])
async def collection_list(client: AsyncQdrantClient = Depends(get_qdrant_client)):
    rows = await client.get_collections()
    data = rows.collections
    return NoPageResult(total=len(data), data=data)


@dataset_router.post("/", response_model=DataResult[CollectionInfo])
async def add_collection(req: CollectionAdd, client: AsyncQdrantClient = Depends(get_qdrant_client)):
    exist = await client.collection_exists(req.name)
    if exist:
        return DataResult(status=0, msg="Dataset already exists", data=None)

    add = await client.create_collection(
        collection_name=req.name,
        vectors_config=models.VectorParams(size=3072, distance=models.Distance.COSINE))
    if not add:
        return DataResult(status=0, msg="Dataset add failed", data=None)

    info = await client.get_collection(req.name)
    return DataResult(status=1, msg=None, data=info)


@dataset_router.get("/{name}", response_model=DataResult[CollectionInfo])
async def collection_info(name: str, client: AsyncQdrantClient = Depends(get_qdrant_client)):
    exist = await client.collection_exists(name)
    if not exist:
        return DataResult(status=0, msg="Dataset not exists", data=None)

    info = await client.get_collection(name)
    return DataResult(status=1, msg=None, data=info)


@dataset_router.delete("/{name}", response_model=DataResult[str])
async def delete_collection(name: str, client: AsyncQdrantClient = Depends(get_qdrant_client)):
    exist = await client.collection_exists(name)
    if not exist:
        return DataResult(status=0, msg="Dataset not exists", data=None)

    delete = await client.delete_collection(name)
    if not delete:
        return DataResult(status=0, msg="Dataset delete failed", data=None)

    return DataResult(status=1, msg=None, data=None)


@dataset_router.get("/{name}/item", response_model=PageResult[Record])
async def item_list(name: str, params: PageParams = Depends(), client: AsyncQdrantClient = Depends(get_qdrant_client)):
    records, next_page_offset = await client.scroll(
        collection_name=name,
        limit=params.size,
        offset=params.offset,
        with_payload=True
    )
    info = await client.count(collection_name=name)
    total = info.count
    return PageResult(
        total=total,
        data=records,
        page=params.page,
        size=params.size
    )


@dataset_router.post("/{name}/item", response_model=DataResult[str])
async def add_item(name: str, req: ItemAdd, client: AsyncQdrantClient = Depends(get_qdrant_client)):
    vector = await get_embedding_async(text=req.text)
    key = hashlib.md5(req.text.encode()).hexdigest()
    uu_id = uuid.UUID(key)
    await client.upsert(collection_name=name, points=[
        models.PointStruct(id=uu_id, vector=vector, payload={"content": req.text})
    ])
    return DataResult(status=1, msg=None, data=uu_id)


@dataset_router.post("/{name}/item/upload", response_model=DataResult[List[str]])
async def upload_item(name: str, file: UploadFile = File(...), client: AsyncQdrantClient = Depends(get_qdrant_client)):
    try:
        content = await file.read()
        full_text = content.decode("utf-8")
        raw_chunks = re.split(r'\n\s*\n', full_text)

        texts = [chunk.strip() for chunk in raw_chunks if chunk.strip()]
        if not texts:
            return DataResult(status=0, msg="未识别到有效的数据分块", data=[])

        vectors = await get_embeddings_async_batch(texts=texts)

        points = []
        new_ids = []
        for i, text in enumerate(texts):
            key = hashlib.md5(text.encode()).hexdigest()
            uu_id = str(uuid.UUID(key))

            points.append(
                PointStruct(
                    id=uu_id,
                    vector=vectors[i],
                    payload={"content": text}
                )
            )
            new_ids.append(uu_id)

        client.upload_points(
            collection_name=name,
            points=points,
            wait=True,
            batch_size=64
        )

        return DataResult(status=1, msg=None, data=new_ids)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导入失败: {str(e)}")


@dataset_router.put("/{name}/item/{item_id}", response_model=DataResult[str])
async def update_item(name: str, item_id: str, req: ItemUpdate, client: AsyncQdrantClient = Depends(get_qdrant_client)):
    vector = await get_embedding_async(text=req.text)
    key = hashlib.md5(req.text.encode()).hexdigest()
    uu_id = uuid.UUID(key)
    if str(uu_id) != item_id:
        await client.delete(collection_name=name, points_selector=[item_id], wait=False)
    await client.upsert(collection_name=name, points=[
        models.PointStruct(id=uu_id, vector=vector, payload={"content": req.text})
    ])
    return DataResult(status=1, msg=None, data=uu_id)


@dataset_router.get("/{name}/item/{item_id}", response_model=DataResult[Record])
async def get_item(name: str, item_id: str, client: AsyncQdrantClient = Depends(get_qdrant_client)):
    res = await client.retrieve(collection_name=name, ids=[item_id])
    if not res:
        return DataResult(status=0, msg="Item not found", data=None)
    return DataResult(status=1, data=res[0], msg=None)


@dataset_router.delete("/{name}/item/{item_id}", response_model=DataResult[str])
async def delete_item(name: str, item_id: str, client: AsyncQdrantClient = Depends(get_qdrant_client)):
    await client.delete(collection_name=name, points_selector=[item_id], wait=True)
    return DataResult(status=1, msg=None, data=None)


@dataset_router.delete("/{name}/item/delete", response_model=DataResult[str])
async def batch_delete_item(name: str, req: ItemDelete, client: AsyncQdrantClient = Depends(get_qdrant_client)):
    await client.delete(collection_name=name, points_selector=req.ids, wait=True)
    return DataResult(status=1, msg=None, data=None)


@dataset_router.delete("/{name}/clear", response_model=DataResult[str])
async def clear_items(name: str, client: AsyncQdrantClient = Depends(get_qdrant_client)):
    await client.delete(
        collection_name=name,
        points_selector=models.Filter(must=[]) # 匹配所有
    )
    return DataResult(status=1, msg=None, data=None)


@dataset_router.post("/{name}/search", response_model=NoPageResult[ScoredPoint])
async def add_item(name: str, req: ItemSearch, client: AsyncQdrantClient = Depends(get_qdrant_client)):
    vector = await get_embedding_async(text=req.text)

    rows = await client.query_points(
        collection_name=name,
        query=vector,
        limit=req.top_k,
        with_payload=True
    )
    return NoPageResult(total=len(rows.points), data=rows.points)