"""initial schema baseline

Revision ID: 20260525_0001
Revises:
Create Date: 2026-05-25
"""

from typing import Sequence, Union

revision: str = "20260525_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Baseline migration for existing MVP installs. The app still creates tables
    # during startup for local MVP convenience; future schema changes should be
    # generated through Alembic from the SQLAlchemy metadata.
    pass


def downgrade() -> None:
    pass
