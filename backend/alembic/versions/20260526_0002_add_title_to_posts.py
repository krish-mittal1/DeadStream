"""add title column to posts table

Revision ID: 20260526_0002
Revises: 20260525_0001
Create Date: 2026-05-26
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260526_0002"
down_revision: Union[str, None] = "20260525_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("posts", sa.Column("title", sa.String(300), nullable=True))


def downgrade() -> None:
    op.drop_column("posts", "title")
