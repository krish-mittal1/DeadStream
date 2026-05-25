"""Tests for feed, posting, and moderation endpoints."""

import pytest


@pytest.mark.asyncio
async def test_get_feed(client):
    """Feed endpoint returns a list."""
    response = await client.get("/api/feed")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_create_post_requires_auth(client):
    """Posting without auth returns 401 or 403."""
    response = await client.post("/api/posts", json={"body": "Hello world"})
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_create_and_like_post(client):
    """Registered user can create a post and like it."""
    # Register
    reg = await client.post(
        "/api/auth/register",
        json={"username": "poster", "password": "testpass123", "display_name": "Poster"},
    )
    assert reg.status_code == 200
    token = reg.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create post
    post_resp = await client.post("/api/posts", json={"body": "Test post body"}, headers=headers)
    assert post_resp.status_code == 200, f"Post creation failed: {post_resp.text}"
    post = post_resp.json()
    assert post["body"] == "Test post body"
    post_id = post["id"]

    # Like the post
    like_resp = await client.post(f"/api/posts/{post_id}/like", headers=headers)
    assert like_resp.status_code == 200


@pytest.mark.asyncio
async def test_moderation_cooldown(client):
    """Moderately spammy content triggers cooldown action but is still allowed."""
    reg = await client.post(
        "/api/auth/register",
        json={"username": "spammer", "password": "testpass123", "display_name": "Spammer"},
    )
    token = reg.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Long repetitive content (950 'a' chars) triggers cooldown but passes
    response = await client.post(
        "/api/posts",
        json={"body": "a" * 950},
        headers=headers,
    )
    assert response.status_code == 200, f"Expected post allowed with cooldown, got {response.status_code}"
