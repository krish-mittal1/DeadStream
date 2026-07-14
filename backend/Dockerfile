FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_DEFAULT_TIMEOUT=120

WORKDIR /app

# Copy package source BEFORE pip install so hatchling can build the wheel
# and actually install project dependencies from pyproject.toml.
COPY pyproject.toml /app/pyproject.toml
COPY app /app/app
COPY alembic.ini /app/alembic.ini
COPY migrations /app/migrations
COPY docker-entrypoint.sh /app/docker-entrypoint.sh

# Free-tier VPS (~8GB): do NOT install torch/sentence-transformers.
# Those packages are hundreds of MB–GBs and fill the disk.
# Embeddings fall back to the deterministic hash embedder in app/services/embedder.py.
# RAG still works (same 384-dim vectors); quality is lower than MiniLM but fits the box.
RUN pip install --no-cache-dir --upgrade pip wheel hatchling \
    && pip install --no-cache-dir --retries 5 . \
    && python -c "import alembic.config; print('alembic package OK')" \
    && python -c "import fastapi, uvicorn, sqlalchemy; print('core deps OK')" \
    && chmod +x /app/docker-entrypoint.sh \
    && pip uninstall -y hatchling wheel pathspec trove-classifiers pluggy editables || true \
    && find /usr/local/lib/python3.12/site-packages -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null; \
       find /usr/local/lib/python3.12/site-packages -name '*.pyc' -delete 2>/dev/null; \
       find /usr/local/lib/python3.12/site-packages -name '*.pyo' -delete 2>/dev/null; \
       true \
    && python -c "import alembic.config; print('alembic still OK after cleanup')" \
    && du -sh /usr/local/lib/python3.12/site-packages | awk '{print "site-packages size:", $1}'

EXPOSE 8000
CMD ["/app/docker-entrypoint.sh"]
