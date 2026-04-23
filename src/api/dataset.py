import time
import json
from typing import List, Any, cast

from fastapi import APIRouter, Depends, HTTPException
from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models
from qdrant_client.models import (
    CollectionDescription,
    CollectionInfo,
    ScoredPoint,
    Record,
    PointStruct
)

from src.database.postgre import get_db_pool
from src.dataset.embedding import get_embedding_async, get_embeddings_async_batch
from src.dataset.qdrant import get_qdrant_client_async
from src.schemas.dataset import CollectionAdd, ItemSearch, ItemAdd, ItemUpdate, ItemDelete, FieldItem, ItemBatch
from src.schemas.page import NoPageResult, DataResult, PageResult, PageParams
from src.utils.auth import get_admin_entity
from src.utils.dataset import validate_and_fill_metadata, build_qdrant_filter, get_qdrant_index_params
from src.utils.uuid import generate_timestamp_uuid

dataset_router = APIRouter(prefix="/dataset", tags=["Dataset"], dependencies=[Depends(get_admin_entity)])


@dataset_router.get("", response_model=NoPageResult[CollectionDescription])
async def collection_list(
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    rows = await client.get_collections()
    data = rows.collections
    return NoPageResult(total=len(data), data=data)


@dataset_router.post("", response_model=DataResult[CollectionInfo])
async def add_collection(
        req: CollectionAdd,
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    exist = await client.collection_exists(req.name)
    if exist:
        raise HTTPException(status_code=400, detail="Dataset already exists")

    add = await client.create_collection(
        collection_name=req.name,
        vectors_config=models.VectorParams(size=3072, distance=models.Distance.COSINE))
    if not add:
        raise HTTPException(status_code=400, detail="Dataset add failed")

    info = await client.get_collection(req.name)

    return DataResult(status=1, data=info)


@dataset_router.get("/{name}", response_model=DataResult[CollectionInfo])
async def collection_info(
        name: str,
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    exist = await client.collection_exists(name)
    if not exist:
        raise HTTPException(status_code=400, detail="Dataset already exists")

    info = await client.get_collection(name)
    return DataResult(status=1, data=info)


@dataset_router.delete("/{name}", response_model=DataResult[str])
async def delete_collection(
        name: str,
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    exist = await client.collection_exists(name)
    if not exist:
        raise HTTPException(status_code=400, detail="Dataset already exists")

    delete = await client.delete_collection(name)
    if not delete:
        raise HTTPException(status_code=400, detail="Dataset delete failed")

    return DataResult(status=1)


@dataset_router.get("/{name}/item", response_model=PageResult[Record])
async def item_list(
        name: str,
        params: PageParams = Depends(),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    exist = await client.collection_exists(name)
    if not exist:
        raise HTTPException(status_code=400, detail="Dataset already exists")

    info = await client.count(collection_name=name)
    total = info.count

    if total == 0:
        return PageResult(total=0, data=[], page=params.page, size=params.size)

    target_index = (params.page - 1) * params.size
    qdrant_offset = None

    if target_index > 0:
        # 只拉取 ID 列表，不拉取 payload，速度极快
        # limit 设置为 target_index + 1，拿到目标页第一个 ID
        ids_only, _ = await client.scroll(
            collection_name=name,
            limit=target_index + 1,
            with_payload=False,
            with_vectors=False
        )

        if ids_only:
            # 获取最后一条记录的 ID 作为下一页的起点
            qdrant_offset = ids_only[-1].id

    records, _ = await client.scroll(
        collection_name=name,
        limit=params.size,
        offset=qdrant_offset,
        with_payload=True,
        with_vectors=False
    )
    return PageResult(
        total=total,
        data=records,
        page=params.page,
        size=params.size
    )


@dataset_router.get("/{name}/count", response_model=DataResult[int])
async def item_count(
        name: str,
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    exist = await client.collection_exists(name)
    if not exist:
        raise HTTPException(status_code=400, detail="Dataset already exists")

    info = await client.count(collection_name=name)
    total = info.count
    return DataResult(status=1, data=total)


@dataset_router.post("/{name}/item", response_model=DataResult[str])
async def add_item(
        name: str,
        req: ItemAdd,
        db_pool=Depends(get_db_pool),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    exist = await client.collection_exists(name)
    if not exist:
        raise HTTPException(status_code=400, detail="Dataset already exists")

    validated_metadata = await validate_and_fill_metadata(
        collection_name=name,
        metadata=[req.metadata or {}],
        pool=db_pool
    )
    vector = await get_embedding_async(text=req.content)
    ms_timestamp = int(time.time() * 1000)
    uu_id = generate_timestamp_uuid(ms_timestamp)
    payload = {
        "content": req.content,
        "updated_at": ms_timestamp,
        **validated_metadata[0]
    }
    await client.upsert(collection_name=name, points=[
        models.PointStruct(id=uu_id, vector=vector, payload=payload)
    ])
    return DataResult(status=1, data=str(uu_id))


@dataset_router.get("/{name}/all", response_model=NoPageResult[Record])
async def get_all_items(
        name: str,
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    exist = await client.collection_exists(name)
    if not exist:
        raise HTTPException(status_code=400, detail="Dataset already exists")

    all_records: List[Record] = []
    offset = None
    batch_size = 100  # 每批获取数量

    while True:
        records, next_offset = await client.scroll(
            collection_name=name,
            limit=batch_size,
            offset=offset,
            with_payload=True,
            with_vectors=False
        )
        all_records.extend(records)

        if next_offset is None:
            break
        offset = next_offset

    return NoPageResult(data=all_records, total=len(all_records))


@dataset_router.post("/{name}/batch", response_model=NoPageResult[Record])
async def batch_get_items(
        name: str,
        req: ItemBatch,
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    exist = await client.collection_exists(name)
    if not exist:
        raise HTTPException(status_code=400, detail="Dataset already exists")

    if not req.ids:
        return NoPageResult(data=[], total=0)

    records = await client.retrieve(
        collection_name=name,
        ids=req.ids,
        with_payload=True,
        with_vectors=False
    )

    if not records:
        return NoPageResult(data=[], total=0)

    return NoPageResult(data=records, total=len(records))


@dataset_router.post("/{name}/item/upload", response_model=DataResult[List[str]])
async def upload_item(
        name: str,
        req: List[ItemAdd],
        db_pool=Depends(get_db_pool),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    exist = await client.collection_exists(name)
    if not exist:
        raise HTTPException(status_code=400, detail="Dataset already exists")

    metadata = [item.metadata or {} for item in req]
    validated_metadata = await validate_and_fill_metadata(
        collection_name=name,
        metadata=metadata,
        pool=db_pool
    )

    texts = [item.content for item in req]
    vectors = await get_embeddings_async_batch(texts=texts)

    points = []
    new_ids = []
    ms_timestamp = int(time.time() * 1000)
    for i, text in enumerate(texts):
        uu_id = generate_timestamp_uuid(ms_timestamp + i)
        payload = {
            "content": text,
            "updated_at": ms_timestamp + i,
            **validated_metadata[i]
        }

        points.append(PointStruct(id=uu_id, vector=vectors[i], payload=payload))
        new_ids.append(str(uu_id))

    client.upload_points(
        collection_name=name,
        points=points,
        wait=True,
        batch_size=64
    )
    return DataResult(status=1, data=new_ids)


@dataset_router.put("/{name}/item/{item_id}", response_model=DataResult[str])
async def update_item(
        name: str,
        item_id: str,
        req: ItemUpdate,
        db_pool=Depends(get_db_pool),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    exist = await client.collection_exists(name)
    if not exist:
        raise HTTPException(status_code=400, detail="Dataset already exists")

    validated_metadata = await validate_and_fill_metadata(
        collection_name=name,
        metadata=[req.metadata or {}],
        pool=db_pool
    )
    vector = await get_embedding_async(text=req.content)
    ms_timestamp = int(time.time() * 1000)
    uu_id = generate_timestamp_uuid(ms_timestamp)
    payload = {
        "content": req.content,
        "updated_at": ms_timestamp,
        **validated_metadata[0]
    }

    if str(uu_id) != item_id:
        await client.delete(collection_name=name, points_selector=[item_id], wait=False)

    await client.upsert(collection_name=name, points=[
        models.PointStruct(id=uu_id, vector=vector, payload=payload)
    ])
    return DataResult(status=1, data=str(uu_id))


@dataset_router.get("/{name}/item/{item_id}", response_model=DataResult[Record])
async def get_item(
        name: str,
        item_id: str,
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    exist = await client.collection_exists(name)
    if not exist:
        raise HTTPException(status_code=400, detail="Dataset already exists")

    res = await client.retrieve(collection_name=name, ids=[item_id], with_payload=True)

    if not res:
        return DataResult(status=0, msg="Item not found")

    return DataResult(status=1, data=res[0])


@dataset_router.delete("/{name}/item/delete", response_model=DataResult[str])
async def delete_item(
        name: str,
        req: ItemDelete,
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    exist = await client.collection_exists(name)
    if not exist:
        raise HTTPException(status_code=400, detail="Dataset already exists")

    await client.delete(collection_name=name, points_selector=req.ids, wait=True)
    return DataResult(status=1)


@dataset_router.delete("/{name}/clear", response_model=DataResult[str])
async def clear_items(
        name: str,
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    exist = await client.collection_exists(name)
    if not exist:
        raise HTTPException(status_code=400, detail="Dataset already exists")

    await client.delete(
        collection_name=name,
        points_selector=models.Filter(must=[])  # 匹配所有
    )
    return DataResult(status=1)


@dataset_router.post("/{name}/search", response_model=NoPageResult[ScoredPoint])
async def search_item(
        name: str,
        req: ItemSearch,
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    exist = await client.collection_exists(name)
    if not exist:
        raise HTTPException(status_code=400, detail="Dataset already exists")

    vector = await get_embedding_async(text=req.text)

    filter_obj = build_qdrant_filter(req.filters) if req.filters else None

    rows = await client.query_points(
        collection_name=name,
        query=cast(Any, vector),
        limit=req.top_k,
        with_payload=True,
        query_filter=filter_obj
    )
    return NoPageResult(total=len(rows.points), data=rows.points)


@dataset_router.get("/{name}/fields", response_model=DataResult[List[FieldItem]])
async def list_fields(
        name: str,
        db_pool = Depends(get_db_pool),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    exist = await client.collection_exists(name)
    if not exist:
        raise HTTPException(status_code=400, detail="Dataset already exists")

    async with db_pool.connection() as conn:
        cur = await conn.execute(
            """
            SELECT field_name, field_type, is_required, default_value, description
            FROM collection_fields
            WHERE collection_name = %s
              AND deleted_at IS NULL
            ORDER BY id
            """,
            (name,)
        )
        rows = await cur.fetchall()
        fields = [
            FieldItem(
                field_name=row["field_name"],
                field_type=row["field_type"],
                is_required=row["is_required"] or False,
                default_value=json.loads(row["default_value"]) if row["default_value"] else None,
                description=row["description"] or None
            )
            for row in rows
        ]
    return DataResult(status=1, data=fields)


@dataset_router.post("/{name}/fields", response_model=DataResult[str])
async def replace_fields(
        name: str,
        req: List[FieldItem],
        db_pool = Depends(get_db_pool),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    exist = await client.collection_exists(name)
    if not exist:
        raise HTTPException(status_code=400, detail="Dataset already exists")

    # 基础校验：字段名不能重复
    field_names = [item.field_name for item in req]
    if len(field_names) != len(set(field_names)):
        raise HTTPException(status_code=400, detail="Duplicate field names are not allowed")

    # 类型校验：确保 field_type 是支持的类型
    allowed_types = {"string", "number", "boolean", "array", "object"}
    for item in req:
        if item.field_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported field_type '{item.field_type}' for field '{item.field_name}'"
            )

    async with db_pool.connection() as conn:
        async with conn.transaction():
            # 1. 软删除该集合下所有未被删除的字段
            await conn.execute(
                """
                UPDATE collection_fields
                SET deleted_at = NOW()
                WHERE collection_name = %s
                  AND deleted_at IS NULL
                """,
                (name,)
            )

            # 2. 批量插入新字段定义
            for item in req:
                await conn.execute(
                    """
                    INSERT INTO collection_fields
                    (collection_name, field_name, field_type, is_required, default_value, description)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        name,
                        item.field_name,
                        item.field_type,
                        item.is_required,
                        json.dumps(item.default_value) if item.default_value is not None else None,
                        item.description
                    )
                )

    # 获取当前集合的所有 payload 索引
    info = await client.get_collection(collection_name=name)
    existing_indexes = info.payload_schema or {}

    # 删除所有已存在的索引
    for field_name in existing_indexes.keys():
        await client.delete_payload_index(
            collection_name=name,
            field_name=field_name,
            wait=True
        )

    # 根据新字段定义创建索引
    for item in req:
        field_name = item.field_name
        field_type = item.field_type

        # 根据类型映射 Qdrant 索引参数
        index_params = await get_qdrant_index_params(field_type)

        if index_params is not None:
            await client.create_payload_index(
                collection_name=name,
                field_name=field_name,
                field_schema=index_params,
                wait=True
            )

    return DataResult(status=1, data=name)