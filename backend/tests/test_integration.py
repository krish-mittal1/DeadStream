"""Integration tests for critical auth, DM authorization, and feed flows."""

from __future__ import annotations

import pytest


@pytest.mark.asyncio
async def test_dm_authorization(client):
    """Non-participant cannot read another user's DM messages."""
    # Register user A
    reg_a = await client.post(
        "/api/auth/register",
        json={"username": "user_a", "password": "testpass123", "display_name": "User A"},
    )
    assert reg_a.status_code == 200
    token_a = reg_a.json()["token"]

    # Register user B
    reg_b = await client.post(
        "/api/auth/register",
        json={"username": "user_b", "password": "testpass123", "display_name": "User B"},
    )
    assert reg_b.status_code == 200
    token_b = reg_b.json()["token"]
    user_b_id = reg_b.json()["user_id"]

    # Register user C (the attacker)
    reg_c = await client.post(
        "/api/auth/register",
        json={"username": "user_c", "password": "testpass123", "display_name": "User C"},
    )
    assert reg_c.status_code == 200
    token_c = reg_c.json()["token"]

    # User A sends a DM to User B
    send_resp = await client.post(
        "/api/dm/send",
        json={"recipient_id": user_b_id, "body": "Secret message from A to B"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert send_resp.status_code == 200
    dm_group_id = send_resp.json()["dm_group_id"]

    # User C (non-participant) tries to read messages — should get empty list
    read_resp = await client.get(
        f"/api/dm/groups/{dm_group_id}/messages",
        headers={"Authorization": f"Bearer {token_c}"},
    )
    assert read_resp.status_code == 200
    assert read_resp.json() == [], "Non-participant should get empty list, not leaked DMs"


@pytest.mark.asyncio
async def test_agent_list_public(client):
    """Agents list is publicly accessible without auth."""
    resp = await client.get("/api/agents")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_user_profile_endpoint(client):
    """User profile endpoint returns profile data for existing user."""
    reg = await client.post(
        "/api/auth/register",
        json={"username": "profuser", "password": "testpass123", "display_name": "Profile User"},
    )
    assert reg.status_code == 200
    user_id = reg.json()["user_id"]

    resp = await client.get(f"/api/users/{user_id}/profile")
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "profuser"
    assert data["display_name"] == "Profile User"


@pytest.mark.asyncio
async def test_follow_user(client):
    """Registered user can follow another user."""
    reg_a = await client.post(
        "/api/auth/register",
        json={"username": "follow_a", "password": "testpass123", "display_name": "Follow A"},
    )
    token_a = reg_a.json()["token"]

    reg_b = await client.post(
        "/api/auth/register",
        json={"username": "follow_b", "password": "testpass123", "display_name": "Follow B"},
    )
    user_b_id = reg_b.json()["user_id"]
    token_b = reg_b.json()["token"]

    # User A follows User B
    resp = await client.post(
        f"/api/users/{user_b_id}/follow",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_notification_flow(client):
    """Creating a post triggers a notification flow (no crash)."""
    reg = await client.post(
        "/api/auth/register",
        json={"username": "notif_user", "password": "testpass123", "display_name": "Notif"},
    )
    token = reg.json()["token"]
    user_id = reg.json()["user_id"]

    # Create a post
    post_resp = await client.post(
        "/api/posts",
        json={"body": "Notification test post"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert post_resp.status_code == 200
    post_id = post_resp.json()["id"]

    # Like the post
    like_resp = await client.post(
        f"/api/posts/{post_id}/like",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert like_resp.status_code == 200

    # Check notifications
    notif_resp = await client.get(
        "/api/notifications",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert notif_resp.status_code == 200
    assert isinstance(notif_resp.json(), list)


@pytest.mark.asyncio
async def test_dm_and_like_unauthorized_without_token(client):
    """Endpoints requiring auth return 401/403 when no token is provided."""
    resp = await client.get("/api/dm/groups")
    assert resp.status_code in (401, 403)

    resp = await client.post("/api/posts", json={"body": "test"})
    assert resp.status_code in (401, 403)

    resp = await client.get("/api/notifications")
    assert resp.status_code in (401, 403)

    resp = await client.post("/api/posts/some-id/like")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_create_post_with_comment(client):
    """A user can create a post and reply to it."""
    reg = await client.post(
        "/api/auth/register",
        json={"username": "comment_user", "password": "testpass123", "display_name": "Commenter"},
    )
    token = reg.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create post
    post_resp = await client.post("/api/posts", json={"body": "Parent post"}, headers=headers)
    assert post_resp.status_code == 200
    parent_id = post_resp.json()["id"]

    # Reply to it
    reply_resp = await client.post(
        "/api/posts",
        json={"body": "A reply!", "parent_id": parent_id},
        headers=headers,
    )
    assert reply_resp.status_code == 200
    assert reply_resp.json()["parent_id"] == parent_id
    assert reply_resp.json()["body"] == "A reply!"
