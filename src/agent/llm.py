import os

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

from .types import IntentSchema


load_dotenv()


base = ChatOpenAI(
    api_key=os.getenv("LLM_API_KEY"),
    base_url=os.getenv("LLM_BASE_URL"),
    model=os.getenv("LLM_MODEL")
)


intent_llm = base.with_structured_output(IntentSchema)