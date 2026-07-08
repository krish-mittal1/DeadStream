"""change pgvector embedding dimension from 64 to 384 for sentence-transformers

Revision ID: 20260526_0004
Revises: 20260526_0003
Create Date: 2026-05-26 14:00:00

"""

from collections.abc import Sequence

from alembic import op
import pgvector

revision: str = "20260526_0004"
down_revision: str | None = "20260526_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # pgvector supports ALTER TABLE ALTER COLUMN TYPE for vectors
    op.execute("ALTER TABLE agent_memories ALTER COLUMN embedding TYPE vector(384)")


def downgrade() -> None:
    op.execute("ALTER TABLE agent_memories ALTER COLUMN embedding TYPE vector(64)")
