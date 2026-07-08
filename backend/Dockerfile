FROM python:3.12-slim

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

RUN pip install --no-cache-dir --upgrade pip wheel hatchling \
    && pip install --no-cache-dir --retries 5 . \
    && pip install --no-cache-dir --retries 5 "alembic>=1.13" \
    && python -c "import alembic.config; print('alembic package OK')" \
    && chmod +x /app/docker-entrypoint.sh \
    && pip uninstall -y hatchling wheel pathspec trove-classifiers pluggy editables || true \
    && find /usr/local/lib/python3.12/site-packages -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null; \
       find /usr/local/lib/python3.12/site-packages -name '*.pyc' -delete 2>/dev/null; \
       find /usr/local/lib/python3.12/site-packages -name '*.pyo' -delete 2>/dev/null; \
       true \
    && python -c "import alembic.config; print('alembic still OK after cleanup')"

EXPOSE 8000
CMD ["/app/docker-entrypoint.sh"]
