import asyncio
import sys

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import os
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


from src.api.api_key import api_key_router
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


app.include_router(router=api_key_router)
app.include_router(router=auth_router)
app.include_router(router=chat_router)
app.include_router(router=dataset_router)
app.include_router(router=user_router)


def patch_windows_loop():
    """专门针对 Windows 异步环境的补丁"""
    if sys.platform == 'win32':
        # 必须使用 Selector 策略，否则 psycopg 会报 "ValueError: Invalid file descriptor: -1"
        # 或者在某些 I/O 操作时直接卡死/报错
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

if __name__ == "__main__":
    patch_windows_loop()

    config = uvicorn.Config(
        "src.main:app",
        host="0.0.0.0",
        port=10085,
        loop="asyncio",  # 显式指定使用标准 asyncio 库
        reload=False  # 注意：Windows 下开启 reload 会导致 loop 策略失效，请先关掉测试
    )
    server = uvicorn.Server(config)

    # 暴力启动方案：
    # 如果 sys.platform == 'win32'，确保我们手动运行 loop
    if sys.platform == 'win32':
        loop = asyncio.SelectorEventLoop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(server.serve())
        except KeyboardInterrupt:
            # 优雅尝试：通知 uvicorn 停止
            server.should_exit = True
            print("\n[System] 正在停止服务...")
        finally:
            # 彻底清理
            try:
                # 再次运行直到 server 状态更新（给钩子函数执行时间）
                if server.started:
                    loop.run_until_complete(server.shutdown())

                # 显式关闭所有挂起的任务（解决连接池关闭慢的问题）
                pending = asyncio.all_tasks(loop)
                loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
            except Exception:
                pass

            print("[System] 服务已关闭")
            # 最后的“暴力”美学：确保进程不残留
            os._exit(0)
    else:
        server.run()