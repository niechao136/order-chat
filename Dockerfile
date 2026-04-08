# 使用高效的 python 镜像
FROM python:3.11-slim-bookworm
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# 1. 安装依赖 (利用缓存)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-cache

# 2. 复制源码
COPY src ./src
COPY .env ./

# 3. 运行
# 使用 uv run 确保在虚拟环境中运行，或者直接调用 .venv 中的 uvicorn
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]