import os
import httpx
from dotenv import load_dotenv

from langchain_google_genai import GoogleGenerativeAIEmbeddings
from google import genai


load_dotenv()


client = genai.Client(
    api_key=os.getenv("EMBEDDING_API_KEY"),
    http_options=genai.types.HttpOptions(httpx_client=genai.types.HttpxClient(proxy="http://127.0.0.1:1080")))

embedding = GoogleGenerativeAIEmbeddings(
    api_key=os.getenv("EMBEDDING_API_KEY"),
    # base_url=os.getenv("EMBEDDING_BASE_URL").strip().rstrip("/"),
    model=os.getenv("EMBEDDING_MODEL"),
    # client=httpx.Client(http2=False, timeout=20, proxy="http://127.0.0.1:1080")
)


def get_embedding(text: str) -> list[float]:
    """将文本转换为 768 维向量"""
    if not text.strip():
        return [0.0] * 768
    return embedding.embed_query(text)


async def get_embedding_async(text: str) -> list[float]:
    """将文本转换为 1536 维向量"""
    if not text.strip():
        return [0.0] * 1536
    return await embedding.aembed_query(text)


def get_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """将多个文本转换为向量列表"""
    # 过滤掉空字符串，防止 API 报错，但要保持索引对应
    if not texts:
        return []
    return embedding.embed_documents(texts)


async def get_embeddings_async_batch(texts: list[str]) -> list[list[float]]:
    """异步将多个文本转换为向量列表"""
    if not texts:
        return []
    return await embedding.aembed_documents(texts)


if __name__ == "__main__":
    res = client.models.embed_content(model="gemini-embedding-2-preview", contents="hello world")
    print(res.embeddings[0].values)
    # vec = get_embedding("hello world")
    # print(f"成功！维度为: {len(vec)}")