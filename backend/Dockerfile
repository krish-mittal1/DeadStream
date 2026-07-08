FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=120

WORKDIR /app

COPY pyproject.toml /app/pyproject.toml
RUN pip install --no-cache-dir --upgrade pip wheel hatchling \
    && pip install --no-cache-dir --retries 5 . \
    && pip uninstall -y hatchling wheel pathspec trove-classifiers pluggy editables \
    && pip install --no-cache-dir --retries 5 alembic \
    && find /usr/local/lib/python3.12/site-packages -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null; \
    find /usr/local/lib/python3.12/site-packages -name '*.pyc' -delete 2>/dev/null; \
    find /usr/local/lib/python3.12/site-packages -name '*.pyo' -delete 2>/dev/null; \
    true

COPY app /app/app
COPY alembic.ini /app/alembic.ini
COPY alembic /app/alembic
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 8000
CMD ["/app/docker-entrypoint.sh"]
