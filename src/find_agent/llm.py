import os

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI


load_dotenv()


client_args = None
proxy = os.getenv("AI_HTTP_PROXY")
if proxy:
    client_args={"proxy": proxy}

base = ChatGoogleGenerativeAI(
    api_key=os.getenv("LLM_API_KEY"),
    model=os.getenv("LLM_MODEL"),
    client_args=client_args
)