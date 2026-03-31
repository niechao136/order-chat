from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from .api.auth import auth_router
from .api.admin import admin_router
from .api.chat import chat_router
from .database.postgre import init_pool, close_pool
from .dataset.qdrant import init_qdrant, close_qdrant


@asynccontextmanager
async def lifespan(_: FastAPI):

    await init_pool()
    await init_qdrant()

    yield

    await close_qdrant()
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
app.include_router(router=admin_router)
app.include_router(router=chat_router)