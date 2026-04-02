import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from src.api.auth import auth_router
from src.api.chat import chat_router
from src.api.dataset import dataset_router
from src.api.user import user_router
from src.database.postgre import init_pool, close_pool, init_db
from src.dataset.qdrant import init_qdrant_async, close_qdrant_async


@asynccontextmanager
async def lifespan(_: FastAPI):

    await init_pool()
    await init_db()
    await init_qdrant_async()

    yield

    await close_qdrant_async()
    await close_pool()


app = FastAPI(root_path="/api", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许访问的域名列表，["*"] 表示允许所有
    allow_credentials=True,  # 是否允许携带 cookie
    allow_methods=["*"],      # 允许的方法，例如 ["GET", "POST"]
    allow_headers=["*"],      # 允许的请求头
)


app.include_router(router=auth_router)
app.include_router(router=chat_router)
app.include_router(router=dataset_router)
app.include_router(router=user_router)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=10085)