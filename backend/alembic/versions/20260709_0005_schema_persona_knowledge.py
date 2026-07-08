"""add agent personas, community vibe profiles, and knowledge docs/chunks

Revision ID: 20260709_0005
Revises: 20260526_0004
Create Date: 2026-07-09
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260709_0005"
down_revision: str | None = "20260526_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── Agent Personas ───────────────────────────────────────────────
    op.create_table(
        "agent_personas",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("agent_id", sa.Uuid(), nullable=False),
        sa.Column("key", sa.String(80), nullable=False, server_default="default"),
        sa.Column("name", sa.String(120), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("system_prompt", sa.Text(), nullable=False, server_default=""),
        sa.Column("config", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("agent_id", "key", name="uq_agent_persona_key"),
    )
    op.create_index("ix_agent_personas_agent_id", "agent_personas", ["agent_id"])
    op.create_index("ix_agent_personas_is_active", "agent_personas", ["is_active"])
    op.create_index("ix_agent_personas_created_at", "agent_personas", ["created_at"])

    # ── Community Vibe Profiles (optional embedding) ─────────────────
    op.create_table(
        "community_vibe_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("community_id", sa.Uuid(), nullable=False),
        sa.Column("key", sa.String(80), nullable=False, server_default="default"),
        sa.Column("summary", sa.Text(), nullable=False, server_default=""),
        sa.Column("profile", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("embedding", sa.ARRAY(sa.Float()), nullable=True),  # cast via pgvector
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["community_id"], ["communities.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("community_id", "key", name="uq_community_vibe_key"),
    )
    op.create_index("ix_community_vibe_profiles_community_id", "community_vibe_profiles", ["community_id"])
    op.create_index("ix_community_vibe_profiles_updated_at", "community_vibe_profiles", ["updated_at"])
    op.execute(
        "ALTER TABLE community_vibe_profiles ALTER COLUMN embedding TYPE vector(384) USING embedding::vector(384)"
    )

    # ── Knowledge Documents ──────────────────────────────────────────
    op.create_table(
        "knowledge_documents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("owner_type", sa.String(40), nullable=False, server_default="global"),
        sa.Column("owner_id", sa.Uuid(), nullable=True),
        sa.Column("source", sa.String(40), nullable=False, server_default="manual"),
        sa.Column("source_ref", sa.String(1024), nullable=False, server_default=""),
        sa.Column("title", sa.String(300), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_knowledge_documents_owner_type", "knowledge_documents", ["owner_type"])
    op.create_index("ix_knowledge_documents_owner_id", "knowledge_documents", ["owner_id"])
    op.create_index("ix_knowledge_documents_source", "knowledge_documents", ["source"])
    op.create_index("ix_knowledge_documents_created_at", "knowledge_documents", ["created_at"])
    op.create_index("ix_knowledge_doc_owner", "knowledge_documents", ["owner_type", "owner_id", "created_at"])

    # ── Knowledge Chunks (pgvector 384) ───────────────────────────────
    op.create_table(
        "knowledge_chunks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("document_id", sa.Uuid(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("embedding", sa.ARRAY(sa.Float()), nullable=False),  # cast via pgvector
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["document_id"], ["knowledge_documents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_id", "chunk_index", name="uq_knowledge_chunk_doc_idx"),
    )
    op.create_index("ix_knowledge_chunks_document_id", "knowledge_chunks", ["document_id"])
    op.create_index("ix_knowledge_chunks_chunk_index", "knowledge_chunks", ["chunk_index"])
    op.create_index("ix_knowledge_chunks_created_at", "knowledge_chunks", ["created_at"])
    op.execute("ALTER TABLE knowledge_chunks ALTER COLUMN embedding TYPE vector(384) USING embedding::vector(384)")

    # Minimal vector index for similarity search (disk-light vs multiple per-scope indexes).
    # IVFFLAT is reasonably compact; lists tuned low for small datasets.
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_knowledge_chunks_embedding_ivfflat "
        "ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 64)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_knowledge_chunks_embedding_ivfflat")
    op.drop_table("knowledge_chunks")
    op.drop_table("knowledge_documents")
    op.drop_table("community_vibe_profiles")
    op.drop_table("agent_personas")

