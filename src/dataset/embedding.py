import asyncio
import os
from dotenv import load_dotenv

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from google import genai
from google.genai.types import HttpOptions, HttpxClient


load_dotenv()


http_options = None
client_args = None
proxy = os.getenv("AI_HTTP_PROXY")
if proxy:
    http_options=HttpOptions(httpx_client=HttpxClient(proxy=proxy))
    client_args={"proxy": proxy}

client = genai.Client(
    api_key=os.getenv("EMBEDDING_API_KEY"),
    http_options=http_options
)

embedding = GoogleGenerativeAIEmbeddings(
    model=os.getenv("EMBEDDING_MODEL"),
    api_key=os.getenv("EMBEDDING_API_KEY"),
    client_args=client_args
)


def get_embedding(text: str) -> list[float]:
    """将文本转换为 3072 维向量"""
    if not text.strip():
        return [0.0] * 3072
    return embedding.embed_query(text)


async def get_embedding_async(text: str) -> list[float]:
    """将文本转换为 3072 维向量"""
    if not text.strip():
        return [0.0] * 3072
    return await embedding.aembed_query(text)


def get_embeddings_batch(texts: list[str], batch_size: int = 30) -> list[list[float]]:
    """将多个文本转换为向量列表"""
    if not texts:
        return []

    all_vectors = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i: i + batch_size]
        vectors = embedding.embed_documents(batch)
        all_vectors.extend(vectors)
        if i + batch_size < len(texts):
            asyncio.sleep(30)

    return all_vectors


async def get_embeddings_async_batch(texts: list[str], batch_size: int = 30) -> list[list[float]]:
    """异步将多个文本转换为向量列表"""
    if not texts:
        return []

    all_vectors = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i: i + batch_size]
        vectors = await embedding.aembed_documents(batch)
        all_vectors.extend(vectors)
        if i + batch_size < len(texts):
            await asyncio.sleep(30)

    return all_vectors


if __name__ == "__main__":
    res = client.models.embed_content(model=os.getenv("EMBEDDING_MODEL"), contents="hello world")
    print(f"结果：{res}，维度：{len(res.embeddings[0].values)}")
    vec = get_embedding("hello world")
    print(f"成功！维度为: {len(vec)}")