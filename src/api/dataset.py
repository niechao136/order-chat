import time
import json
from typing import List, Any, cast, Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Body
from qdrant_client import AsyncQdrantClient, models
from qdrant_client.http import models

from src.database.postgre import get_db_pool
from src.dataset.embedding import get_embedding_async, get_embeddings_async_batch
from src.dataset.qdrant import get_qdrant_client_async
from src.schemas.dataset import AddDatasetRequest, AddPointRequest, DeletePointsRequest, FieldItem, GetPointsRequest, SearchPointRequest, UpdatePointRequest
from src.schemas.page import NoPageResult, DataResult, PageResult, PageParams
from src.utils.auth import get_admin_entity, get_chat_entity
from src.utils.dataset import check_dataset, validate_and_fill_metadata, build_qdrant_filter, get_qdrant_index_params
from src.utils.uuid import generate_timestamp_uuid


dataset_router = APIRouter(
    prefix="/dataset",
    tags=["Dataset 知识库管理"]
)


@dataset_router.get(
    path="",
    response_model=NoPageResult[models.CollectionDescription],
    summary="获取知识库列表",
    description="查询向量数据库中所有已存在的集合（Collection）列表。"
)
async def get_dataset_list(
        _=Depends(get_chat_entity),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    """
    返回所有知识库的名称。
    """
    rows = await client.get_collections()
    data = rows.collections
    return NoPageResult(total=len(data), data=data)


@dataset_router.post(
    path="",
    response_model=DataResult[models.CollectionInfo],
    summary="创建新知识库",
    description="创建一个新的向量集合。默认配置：向量维度 3072（兼容 OpenAI text-embedding-3-large），使用余弦相似度（Cosine）。"
)
async def add_dataset(
        body: Annotated[AddDatasetRequest, Body(description="集合配置信息，包括名称等")],
        _=Depends(get_admin_entity),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    exist = await client.collection_exists(body.name)
    if exist:
        raise HTTPException(status_code=400, detail=f"知识库 {body.name} 已存在")

    add = await client.create_collection(
        collection_name=body.name,
        vectors_config=models.VectorParams(size=3072, distance=models.Distance.COSINE))

    if not add:
        raise HTTPException(status_code=400, detail="知识库创建失败")

    info = await client.get_collection(body.name)

    return DataResult(status=1, data=info)


@dataset_router.get(
    path="/{dataset_name}",
    response_model=DataResult[models.CollectionInfo],
    summary="获取知识库详细信息",
    description="查询特定知识库的配置详情、向量参数、索引状态以及数据量统计。"
)
async def get_dataset_info(
        dataset_name: Annotated[str, Path(description="知识库名称", examples=["WayFind"])],
        _=Depends(get_admin_entity),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    await check_dataset(client, dataset_name)

    info = await client.get_collection(dataset_name)
    return DataResult(status=1, data=info)


@dataset_router.delete(
    path="/{dataset_name}",
    response_model=DataResult[str],
    summary="删除知识库",
    description="物理删除整个向量集合及其所有数据，操作不可逆，请谨慎调用。"
)
async def delete_dataset(
        dataset_name: Annotated[str, Path(description="知识库名称", examples=["WayFind"])],
        _=Depends(get_admin_entity),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    await check_dataset(client, dataset_name)

    delete = await client.delete_collection(dataset_name)
    if not delete:
        raise HTTPException(status_code=400, detail="知识库删除失败")

    return DataResult(status=1)


@dataset_router.get(
    path="/{dataset_name}/points",
    response_model=PageResult[models.Record],
    summary="分页获取指定知识库向量数据详情列表",
    description="分页查询知识库中的向量数据记录。支持深度分页优化，通过 Scroll API 实现高效数据拉取。"
)
async def get_point_list(
        dataset_name: Annotated[str, Path(description="知识库名称")],
        params: Annotated[PageParams, Depends()],
        _=Depends(get_admin_entity),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    """
    1. 首先获取集合总数。
    2. 如果不是第一页，先快速滚动定位到目标页的起始偏移量（Offset）。
    3. 获取当前页的数据记录（Record）。
    """
    await check_dataset(client, dataset_name)

    info = await client.count(collection_name=dataset_name)
    total = info.count

    if total == 0:
        return PageResult(total=0, data=[], page=params.page, size=params.size)

    target_index = (params.page - 1) * params.size
    qdrant_offset = None

    if target_index > 0:
        # 只拉取 ID 列表，不拉取 payload，速度极快
        # limit 设置为 target_index + 1，拿到目标页第一个 ID
        ids_only, _ = await client.scroll(
            collection_name=dataset_name,
            limit=target_index + 1,
            with_payload=False,
            with_vectors=False
        )

        if ids_only:
            # 获取最后一条记录的 ID 作为下一页的起点
            qdrant_offset = ids_only[-1].id

    records, _ = await client.scroll(
        collection_name=dataset_name,
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


@dataset_router.get(
    path="/{dataset_name}/count",
    response_model=DataResult[int],
    summary="获取指定知识库向量数据的总数",
    description="获取指定知识库向量数据的总数。用于辅助分页。"
)
async def get_point_count(
        dataset_name: Annotated[str, Path(description="知识库名称")],
        _=Depends(get_admin_entity),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    await check_dataset(client, dataset_name)

    info = await client.count(collection_name=dataset_name)
    total = info.count
    return DataResult(status=1, data=total)


@dataset_router.post(
    path="/{dataset_name}/points",
    response_model=DataResult[str],
    summary="新增单条向量数据",
    description="向知识库添加一条文本数据。系统会自动调用 Embedding 接口生成向量，并填充元数据（Metadata）。"
)
async def add_point(
        dataset_name: Annotated[str, Path(description="知识库名称")],
        body: Annotated[AddPointRequest, Body(description="数据内容及元数据")],
        _=Depends(get_admin_entity),
        db_pool=Depends(get_db_pool),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    """
    **流程**:
    1. 校验元数据字段。
    2. 获取文本的 Embedding 向量。
    3. 生成带时间戳的 UUID 确保唯一性。
    4. 执行 Upsert 操作。
    """
    await check_dataset(client, dataset_name)

    validated_metadata = await validate_and_fill_metadata(
        collection_name=dataset_name,
        metadata=[body.metadata or {}],
        pool=db_pool
    )
    vector = await get_embedding_async(text=body.content)
    ms_timestamp = int(time.time() * 1000)
    uu_id = generate_timestamp_uuid(ms_timestamp)
    payload = {
        "content": body.content,
        "updated_at": ms_timestamp,
        **validated_metadata[0]
    }
    await client.upsert(collection_name=dataset_name, points=[
        models.PointStruct(id=uu_id, vector=vector, payload=payload)
    ])
    return DataResult(status=1, data=str(uu_id))


@dataset_router.get(
    path="/{dataset_name}/all",
    response_model=NoPageResult[models.Record],
    summary="获取指定知识库内所有向量数据",
    description="获取指定知识库内所有向量数据。用于向量数据全部导出。"
)
async def get_all_points(
        dataset_name: Annotated[str, Path(description="知识库名称")],
        _=Depends(get_admin_entity),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    await check_dataset(client, dataset_name)

    all_records: List[models.Record] = []
    offset = None
    batch_size = 100  # 每批获取数量

    while True:
        records, next_offset = await client.scroll(
            collection_name=dataset_name,
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


@dataset_router.post(
    path="/{dataset_name}/batch",
    response_model=NoPageResult[models.Record],
    summary="获取指定 ID 数组对应的向量数据",
    description="接收向量 ID 数组，获取它们的数据详情，用于导出选中的向量数据。"
)
async def get_points_by_ids(
        dataset_name: Annotated[str, Path(description="知识库名称")],
        body: Annotated[GetPointsRequest, Body(description="向量 ID 数组")],
        _=Depends(get_admin_entity),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    await check_dataset(client, dataset_name)

    if not body.ids:
        return NoPageResult(data=[], total=0)

    records = await client.retrieve(
        collection_name=dataset_name,
        ids=body.ids,
        with_payload=True,
        with_vectors=False
    )

    if not records:
        return NoPageResult(data=[], total=0)

    return NoPageResult(data=records, total=len(records))


@dataset_router.post(
    path="/{dataset_name}/upload",
    response_model=DataResult[List[str]],
    summary="批量创建向量数据",
    description="接收数据内容和元数据的数组，调用 Embedding 接口生成向量，并填充元数据（Metadata）"
)
async def upload_points(
        dataset_name: Annotated[str, Path(description="知识库名称")],
        body: Annotated[List[AddPointRequest], Body(description="数据内容和元数据的数组")],
        _=Depends(get_admin_entity),
        db_pool=Depends(get_db_pool),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    await check_dataset(client, dataset_name)

    metadata = [item.metadata or {} for item in body]
    validated_metadata = await validate_and_fill_metadata(
        collection_name=dataset_name,
        metadata=metadata,
        pool=db_pool
    )

    texts = [item.content for item in body]
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

        points.append(models.PointStruct(id=uu_id, vector=vectors[i], payload=payload))
        new_ids.append(str(uu_id))

    client.upload_points(
        collection_name=dataset_name,
        points=points,
        wait=True,
        batch_size=64
    )
    return DataResult(status=1, data=new_ids)


@dataset_router.put(
    path="/{dataset_name}/point/{point_id}",
    response_model=DataResult[str],
    summary="修改单笔向量数据",
    description="接收数据内容和元数据的数组，调用 Embedding 接口生成向量，并填充元数据（Metadata）"
)
async def update_point(
        dataset_name: Annotated[str, Path(description="知识库名称")],
        point_id: Annotated[str, Path(description="向量 ID")],
        body: Annotated[UpdatePointRequest, Body(description="数据内容和元数据的数组")],
        _=Depends(get_admin_entity),
        db_pool=Depends(get_db_pool),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    await check_dataset(client, dataset_name)

    validated_metadata = await validate_and_fill_metadata(
        collection_name=dataset_name,
        metadata=[body.metadata or {}],
        pool=db_pool
    )
    vector = await get_embedding_async(text=body.content)
    ms_timestamp = int(time.time() * 1000)
    uu_id = generate_timestamp_uuid(ms_timestamp)
    payload = {
        "content": body.content,
        "updated_at": ms_timestamp,
        **validated_metadata[0]
    }

    await client.delete(collection_name=dataset_name, points_selector=[point_id], wait=False)

    await client.upsert(collection_name=dataset_name, points=[
        models.PointStruct(id=uu_id, vector=vector, payload=payload)
    ])
    return DataResult(status=1, data=str(uu_id))


@dataset_router.get(
    path="/{dataset_name}/point/{point_id}",
    response_model=DataResult[models.Record],
    summary="获取指定向量的数据详情",
    description="接收向量 ID，获取指定向量的数据详情。"
)
async def get_point_info(
        dataset_name: Annotated[str, Path(description="知识库名称")],
        point_id: Annotated[str, Path(description="向量 ID")],
        _=Depends(get_admin_entity),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    await check_dataset(client, dataset_name)

    res = await client.retrieve(collection_name=dataset_name, ids=[point_id], with_payload=True)

    if not res:
        return DataResult(status=0, msg="向量未找到")

    return DataResult(status=1, data=res[0])


@dataset_router.delete(
    path="/{dataset_name}/points",
    response_model=DataResult[str],
    summary="删除指定 ID 数组对应的向量",
    description="删除向量会物理删除指定向量数据，不可撤回，请谨慎操作。"
)
async def delete_points(
        dataset_name: Annotated[str, Path(description="知识库名称")],
        body: Annotated[DeletePointsRequest, Body(description="向量 ID 数组")],
        _=Depends(get_admin_entity),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    await check_dataset(client, dataset_name)

    await client.delete(collection_name=dataset_name, points_selector=body.ids, wait=True)
    return DataResult(status=1)


@dataset_router.delete(
    path="/{dataset_name}/clear",
    response_model=DataResult[str],
    summary="清空指定知识库内的所有向量",
    description="清空知识库会物理删除知识库内的所有向量数据，不可撤回，请谨慎操作。"
)
async def clear_dataset(
        dataset_name: Annotated[str, Path(description="知识库名称")],
        _=Depends(get_admin_entity),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    await check_dataset(client, dataset_name)

    await client.delete(
        collection_name=dataset_name,
        points_selector=models.Filter(must=[])  # 匹配所有
    )
    return DataResult(status=1)


@dataset_router.post(
    path="/{dataset_name}/search",
    response_model=NoPageResult[models.ScoredPoint],
    summary="向量检索（相似度搜索）",
    description="根据输入的文本进行语义搜索。支持通过 filters 字段进行元数据过滤（例如：只搜索特定类型的向量）。"
)
async def search_item(
        dataset_name: Annotated[str, Path(description="知识库名称")],
        body: Annotated[SearchPointRequest, Body(description="搜索参数，包括文本、TopK和过滤条件")],
        _=Depends(get_admin_entity),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    """
    **核心参数说明**:
    - **text**: 搜索关键词。
    - **top_k**: 返回最相似的记录条数。
    - **filters**: 基于元数据的过滤条件（如 field == value）。
    """
    await check_dataset(client, dataset_name)

    vector = await get_embedding_async(text=body.text)

    filter_obj = build_qdrant_filter(body.filters) if body.filters else None

    rows = await client.query_points(
        collection_name=dataset_name,
        query=cast(Any, vector),
        limit=body.top_k,
        with_payload=True,
        query_filter=filter_obj
    )
    return NoPageResult(total=len(rows.points), data=rows.points)


@dataset_router.get(
    path="/{dataset_name}/fields",
    response_model=DataResult[List[FieldItem]],
    summary="获取知识库字段定义",
    description="从 Postgres 中查询该知识库定义的元数据 Schema（字段名、类型、是否必填等）。"
)
async def list_fields(
        dataset_name: Annotated[str, Path(description="知识库名称")],
        _=Depends(get_admin_entity),
        db_pool = Depends(get_db_pool),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    await check_dataset(client, dataset_name)

    async with db_pool.connection() as conn:
        cur = await conn.execute(
            """
            SELECT field_name, field_type, is_required, default_value, description
            FROM collection_fields
            WHERE collection_name = %s
              AND deleted_at IS NULL
            ORDER BY id
            """,
            (dataset_name,)
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


@dataset_router.post(
    path="/{dataset_name}/fields",
    response_model=DataResult[str],
    summary="更新/重置知识库字段及索引",
    description="**重要操作**：全量更新知识库的字段定义，并自动在 Qdrant 中重建对应的 Payload 索引以优化查询效率。"
)
async def replace_fields(
        dataset_name: Annotated[str, Path(description="知识库名称")],
        body: Annotated[List[FieldItem], Body(description="全新的字段定义列表")],
        _=Depends(get_admin_entity),
        db_pool = Depends(get_db_pool),
        client: AsyncQdrantClient = Depends(get_qdrant_client_async)
):
    await check_dataset(client, dataset_name)

    # 基础校验：字段名不能重复
    field_names = [item.field_name for item in body]
    if len(field_names) != len(set(field_names)):
        raise HTTPException(status_code=400, detail="Duplicate field names are not allowed")

    # 类型校验：确保 field_type 是支持的类型
    allowed_types = {"string", "number", "boolean", "array", "object"}
    for item in body:
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
                (dataset_name,)
            )

            # 2. 批量插入新字段定义
            for item in body:
                await conn.execute(
                    """
                    INSERT INTO collection_fields
                    (collection_name, field_name, field_type, is_required, default_value, description)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (
                        dataset_name,
                        item.field_name,
                        item.field_type,
                        item.is_required,
                        json.dumps(item.default_value) if item.default_value is not None else None,
                        item.description
                    )
                )

    # 获取当前集合的所有 payload 索引
    info = await client.get_collection(collection_name=dataset_name)
    existing_indexes = info.payload_schema or {}

    # 删除所有已存在的索引
    for field_name in existing_indexes.keys():
        await client.delete_payload_index(
            collection_name=dataset_name,
            field_name=field_name,
            wait=True
        )

    # 根据新字段定义创建索引
    for item in body:
        field_name = item.field_name
        field_type = item.field_type

        # 根据类型映射 Qdrant 索引参数
        index_params = await get_qdrant_index_params(field_type)

        if index_params is not None:
            await client.create_payload_index(
                collection_name=dataset_name,
                field_name=field_name,
                field_schema=index_params,
                wait=True
            )

    return DataResult(status=1, data=dataset_name)