"""initial schema — full baseline for Alembic-only provisioning

Creates the entire DeadStream schema: users, posts, likes, follows,
communities, memberships, elections, votes, agents, relationships,
opinions, events, notifications, bookmarks, DMs, group chats,
disruptions, troll factions, ideology snapshots, and agent memories.

Revision ID: 20260525_0001
Revises:
Create Date: 2026-05-25
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260525_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── pgvector extension ──────────────────────────────────────────
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # ── Users ────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("username", sa.String(40), nullable=False),
        sa.Column("display_name", sa.String(80), nullable=False),
        sa.Column("bio", sa.Text(), nullable=False, server_default=""),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("is_agent", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_is_agent", "users", ["is_agent"])
    op.create_index("ix_users_created_at", "users", ["created_at"])

    # ── Communities ──────────────────────────────────────────────────
    op.create_table(
        "communities",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("slug", sa.String(60), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("ideology_center", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("conflict_score", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("moderator_id", sa.Uuid(), nullable=True),
        sa.Column("is_dynamic", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["moderator_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_communities_slug", "communities", ["slug"], unique=True)

    # ── Posts ────────────────────────────────────────────────────────
    op.create_table(
        "posts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("author_id", sa.Uuid(), nullable=False),
        sa.Column("community_id", sa.Uuid(), nullable=True),
        sa.Column("parent_id", sa.Uuid(), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("image_url", sa.String(1024), nullable=True),
        sa.Column("controversy_score", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("virality_score", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["author_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["community_id"], ["communities.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["parent_id"], ["posts.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_posts_author_id", "posts", ["author_id"])
    op.create_index("ix_posts_community_id", "posts", ["community_id"])
    op.create_index("ix_posts_parent_id", "posts", ["parent_id"])
    op.create_index("ix_posts_controversy_score", "posts", ["controversy_score"])
    op.create_index("ix_posts_virality_score", "posts", ["virality_score"])
    op.create_index("ix_posts_created_at", "posts", ["created_at"])
    op.create_index("ix_posts_feed_rank", "posts", ["created_at", "virality_score", "controversy_score"])

    # ── Likes ────────────────────────────────────────────────────────
    op.create_table(
        "likes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("post_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "post_id", name="uq_likes_user_post"),
    )
    op.create_index("ix_likes_user_id", "likes", ["user_id"])
    op.create_index("ix_likes_post_id", "likes", ["post_id"])

    # ── Follows ──────────────────────────────────────────────────────
    op.create_table(
        "follows",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("follower_id", sa.Uuid(), nullable=False),
        sa.Column("followee_id", sa.Uuid(), nullable=False),
        sa.Column("strength", sa.Float(), nullable=False, server_default=sa.text("0.1")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["follower_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["followee_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("follower_id", "followee_id", name="uq_follows_pair"),
    )
    op.create_index("ix_follows_follower_id", "follows", ["follower_id"])
    op.create_index("ix_follows_followee_id", "follows", ["followee_id"])

    # ── Community Memberships ────────────────────────────────────────
    op.create_table(
        "community_memberships",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("community_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(40), nullable=False, server_default="member"),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["community_id"], ["communities.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "community_id", name="uq_community_membership"),
    )
    op.create_index("ix_community_memberships_user_id", "community_memberships", ["user_id"])
    op.create_index("ix_community_memberships_community_id", "community_memberships", ["community_id"])

    # ── Community Elections ──────────────────────────────────────────
    op.create_table(
        "community_elections",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("community_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(40), nullable=False, server_default="active"),
        sa.Column("winner_id", sa.Uuid(), nullable=True),
        sa.Column("total_votes", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["community_id"], ["communities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["winner_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_community_elections_community_id", "community_elections", ["community_id"])

    # ── Community Election Votes ─────────────────────────────────────
    op.create_table(
        "community_election_votes",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("election_id", sa.Uuid(), nullable=False),
        sa.Column("voter_id", sa.Uuid(), nullable=False),
        sa.Column("candidate_id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["election_id"], ["community_elections.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["voter_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["candidate_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("election_id", "voter_id", name="uq_election_vote"),
    )
    op.create_index("ix_community_election_votes_election_id", "community_election_votes", ["election_id"])
    op.create_index("ix_community_election_votes_voter_id", "community_election_votes", ["voter_id"])
    op.create_index("ix_community_election_votes_candidate_id", "community_election_votes", ["candidate_id"])

    # ── Agents ───────────────────────────────────────────────────────
    op.create_table(
        "agents",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("template", sa.String(80), nullable=False),
        sa.Column("interests", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("writing_style", sa.String(255), nullable=False, server_default=""),
        sa.Column("political_leaning", sa.String(120), nullable=False, server_default=""),
        sa.Column("emotional_state", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("personality_traits", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("activity_level", sa.Float(), nullable=False, server_default=sa.text("0.5")),
        sa.Column("active_hours", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("next_wake_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_wake_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agents_user_id", "agents", ["user_id"], unique=True)
    op.create_index("ix_agents_template", "agents", ["template"])
    op.create_index("ix_agents_next_wake_at", "agents", ["next_wake_at"])

    # ── Agent Relationships ──────────────────────────────────────────
    op.create_table(
        "agent_relationships",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("source_agent_id", sa.Uuid(), nullable=False),
        sa.Column("target_user_id", sa.Uuid(), nullable=False),
        sa.Column("affinity", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("trust", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("rivalry", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.ForeignKeyConstraint(["source_agent_id"], ["agents.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["target_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agent_relationships_source_agent_id", "agent_relationships", ["source_agent_id"])
    op.create_index("ix_agent_relationships_target_user_id", "agent_relationships", ["target_user_id"])

    # ── Opinion Edges ────────────────────────────────────────────────
    op.create_table(
        "opinion_edges",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("agent_id", sa.Uuid(), nullable=False),
        sa.Column("topic", sa.String(120), nullable=False),
        sa.Column("stance", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("confidence", sa.Float(), nullable=False, server_default=sa.text("0.5")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_opinion_edges_agent_id", "opinion_edges", ["agent_id"])
    op.create_index("ix_opinion_edges_topic", "opinion_edges", ["topic"])

    # ── Agent Memories (pgvector) ────────────────────────────────────
    op.create_table(
        "agent_memories",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("agent_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(40), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("embedding", sa.ARRAY(sa.Float()), nullable=False),  # cast via pgvector
        sa.Column("importance", sa.Float(), nullable=False, server_default=sa.text("0.3")),
        sa.Column("emotional_intensity", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("decay_rate", sa.Float(), nullable=False, server_default=sa.text("0.01")),
        sa.Column("metadata", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_accessed_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_agent_memories_agent_id", "agent_memories", ["agent_id"])
    op.create_index("ix_agent_memories_kind", "agent_memories", ["kind"])
    op.create_index("ix_agent_memories_importance", "agent_memories", ["importance"])
    op.create_index("ix_agent_memories_created_at", "agent_memories", ["created_at"])
    op.create_index(
        "ix_agent_memory_retrieval", "agent_memories", ["agent_id", "importance", "created_at"]
    )

    # Alter the embedding column to vector(64) — 0004 upgrades it to 384
    op.execute("ALTER TABLE agent_memories ALTER COLUMN embedding TYPE vector(64)")

    # ── Events ───────────────────────────────────────────────────────
    op.create_table(
        "events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("type", sa.String(80), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=True),
        sa.Column("subject_id", sa.Uuid(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("correlation_id", sa.String(120), nullable=False),
        sa.Column("causation_id", sa.String(120), nullable=True),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("correlation_id", name="uq_events_correlation_id"),
    )
    op.create_index("ix_events_type", "events", ["type"])
    op.create_index("ix_events_actor_id", "events", ["actor_id"])
    op.create_index("ix_events_subject_id", "events", ["subject_id"])
    op.create_index("ix_events_correlation_id", "events", ["correlation_id"])
    op.create_index("ix_events_occurred_at", "events", ["occurred_at"])
    op.create_index("ix_events_replay", "events", ["occurred_at", "type"])

    # ── Notifications ────────────────────────────────────────────────
    op.create_table(
        "notifications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("actor_id", sa.Uuid(), nullable=False),
        sa.Column("type", sa.String(40), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=True),
        sa.Column("read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["actor_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])
    op.create_index("ix_notifications_created_at", "notifications", ["created_at"])
    op.create_index(
        "ix_notifications_user_unread", "notifications", ["user_id", "read"]
    )

    # ── DM Groups ────────────────────────────────────────────────────
    op.create_table(
        "dm_groups",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("participant_a", sa.Uuid(), nullable=False),
        sa.Column("participant_b", sa.Uuid(), nullable=False),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["participant_a"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["participant_b"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("participant_a", "participant_b", name="uq_dm_pair"),
    )
    op.create_index("ix_dm_groups_participant_a", "dm_groups", ["participant_a"])
    op.create_index("ix_dm_groups_participant_b", "dm_groups", ["participant_b"])

    # ── Direct Messages ──────────────────────────────────────────────
    op.create_table(
        "direct_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("dm_group_id", sa.Uuid(), nullable=False),
        sa.Column("sender_id", sa.Uuid(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["dm_group_id"], ["dm_groups.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_direct_messages_dm_group_id", "direct_messages", ["dm_group_id"])
    op.create_index("ix_direct_messages_sender_id", "direct_messages", ["sender_id"])
    op.create_index("ix_direct_messages_created_at", "direct_messages", ["created_at"])
    op.create_index("ix_dm_group_chrono", "direct_messages", ["dm_group_id", "created_at"])

    # ── Group Chats ──────────────────────────────────────────────────
    op.create_table(
        "group_chats",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("topic", sa.String(300), nullable=False, server_default=""),
        sa.Column("created_by", sa.Uuid(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("last_message_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    # ── Group Chat Participants ──────────────────────────────────────
    op.create_table(
        "group_chat_participants",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("group_chat_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role", sa.String(40), nullable=False, server_default="participant"),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["group_chat_id"], ["group_chats.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("group_chat_id", "user_id", name="uq_gc_participant"),
    )
    op.create_index("ix_group_chat_participants_group_chat_id", "group_chat_participants", ["group_chat_id"])
    op.create_index("ix_group_chat_participants_user_id", "group_chat_participants", ["user_id"])

    # ── Group Chat Messages ──────────────────────────────────────────
    op.create_table(
        "group_chat_messages",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("group_chat_id", sa.Uuid(), nullable=False),
        sa.Column("sender_id", sa.Uuid(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["group_chat_id"], ["group_chats.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_group_chat_messages_group_chat_id", "group_chat_messages", ["group_chat_id"])
    op.create_index("ix_group_chat_messages_sender_id", "group_chat_messages", ["sender_id"])
    op.create_index("ix_group_chat_messages_created_at", "group_chat_messages", ["created_at"])
    op.create_index("ix_gc_message_chrono", "group_chat_messages", ["group_chat_id", "created_at"])

    # ── Disruption Events ────────────────────────────────────────────
    op.create_table(
        "disruption_events",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(40), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("source", sa.String(120), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("infection_rate", sa.Float(), nullable=False, server_default=sa.text("0.0")),
        sa.Column("infected_count", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("payload", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_disruption_events_kind", "disruption_events", ["kind"])
    op.create_index("ix_disruption_active", "disruption_events", ["kind", "active"])

    # ── Troll Factions ───────────────────────────────────────────────
    op.create_table(
        "troll_factions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("disruption_id", sa.Uuid(), nullable=False),
        sa.Column("agent_user_id", sa.Uuid(), nullable=False),
        sa.Column("username", sa.String(80), nullable=False),
        sa.Column("name", sa.String(120), nullable=False, server_default=""),
        sa.Column("aggression", sa.Float(), nullable=False, server_default=sa.text("0.8")),
        sa.Column("posts_made", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["disruption_id"], ["disruption_events.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["agent_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_troll_factions_disruption_id", "troll_factions", ["disruption_id"])
    op.create_index("ix_troll_factions_agent_user_id", "troll_factions", ["agent_user_id"])

    # ── Ideology Snapshots ───────────────────────────────────────────
    op.create_table(
        "ideology_snapshots",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("agent_id", sa.Uuid(), nullable=False),
        sa.Column("template", sa.String(80), nullable=False),
        sa.Column("emotional_state", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("personality_traits", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("interests", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("writing_style", sa.String(255), nullable=False, server_default=""),
        sa.Column("political_leaning", sa.String(120), nullable=False, server_default=""),
        sa.Column("activity_level", sa.Float(), nullable=False, server_default=sa.text("0.5")),
        sa.Column("snapshot_type", sa.String(40), nullable=False, server_default="auto"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["agent_id"], ["agents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ideology_snapshots_agent_id", "ideology_snapshots", ["agent_id"])
    op.create_index("ix_ideology_snapshots_created_at", "ideology_snapshots", ["created_at"])
    op.create_index("ix_ideology_agent_time", "ideology_snapshots", ["agent_id", "created_at"])


def downgrade() -> None:
    op.drop_table("ideology_snapshots")
    op.drop_table("troll_factions")
    op.drop_table("disruption_events")
    op.drop_table("group_chat_messages")
    op.drop_table("group_chat_participants")
    op.drop_table("group_chats")
    op.drop_table("direct_messages")
    op.drop_table("dm_groups")
    op.drop_table("notifications")
    op.drop_table("events")
    op.drop_table("agent_memories")
    op.drop_table("opinion_edges")
    op.drop_table("agent_relationships")
    op.drop_table("agents")
    op.drop_table("community_election_votes")
    op.drop_table("community_elections")
    op.drop_table("community_memberships")
    op.drop_table("follows")
    op.drop_table("likes")
    op.drop_table("posts")
    op.drop_table("communities")
    op.drop_table("users")
    # Don't drop the vector extension — other databases may rely on it
