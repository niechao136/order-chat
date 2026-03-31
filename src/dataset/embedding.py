import os
from dotenv import load_dotenv

from langchain_openai import OpenAIEmbeddings


load_dotenv()


embedding = OpenAIEmbeddings(
    api_key=os.getenv("EMBEDDING_API_KEY"),
    base_url=os.getenv("EMBEDDING_BASE_URL"),
    model=os.getenv("EMBEDDING_MODEL")
)


def get_embedding(text: str) -> list[float]:
    """将文本转换为 1536 维向量"""
    if not text.strip():
        return [0.0] * 1536
    return embedding.embed_query(text)


async def get_embedding_async(text: str) -> list[float]:
    """将文本转换为 1536 维向量"""
    if not text.strip():
        return [0.0] * 1536
    return await embedding.aembed_query(text)