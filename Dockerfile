FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

COPY pyproject.toml .

RUN uv pip install --system --no-cache -r pyproject.toml

COPY src ./src

CMD ["python", "-m", "src" "run"]
