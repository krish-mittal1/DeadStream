#!/bin/sh
set -e
# Migrations are in /app/migrations so they do not shadow the alembic package.
python -c "from alembic.config import main; main(['upgrade', 'head'])"
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers
