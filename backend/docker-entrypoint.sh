#!/bin/sh
set -e
# Migrations live in /app/migrations (NOT /app/alembic) so they don't shadow the alembic package.
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers
