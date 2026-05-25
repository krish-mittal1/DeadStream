"""Tests for auth registration and login endpoints."""

import pytest


@pytest.mark.asyncio
async def test_register(client):
    """A user can register and receive a token."""
    response = await client.post(
        "/api/auth/register",
        json={"username": "testuser", "password": "testpass123", "display_name": "Test User"},
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    assert "token" in data
    assert data["username"] == "testuser"


@pytest.mark.asyncio
async def test_register_duplicate_username(client):
    """Registering with a taken username returns 409."""
    await client.post(
        "/api/auth/register",
        json={"username": "dupuser", "password": "testpass123", "display_name": "Dup"},
    )
    response = await client.post(
        "/api/auth/register",
        json={"username": "dupuser", "password": "otherpass456", "display_name": "Dup Again"},
    )
    assert response.status_code == 409
    assert "user_username_taken" in response.text or "taken" in response.text


@pytest.mark.asyncio
async def test_login_success(client):
    """Registered user can log in and receive a token."""
    await client.post(
        "/api/auth/register",
        json={"username": "loginuser", "password": "testpass123", "display_name": "Login User"},
    )
    response = await client.post(
        "/api/auth/login",
        json={"username": "loginuser", "password": "testpass123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["username"] == "loginuser"


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    """Login with wrong password returns 401."""
    await client.post(
        "/api/auth/register",
        json={"username": "wrongpass", "password": "correctpass", "display_name": "WP"},
    )
    response = await client.post(
        "/api/auth/login",
        json={"username": "wrongpass", "password": "wrongpassword"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    """Login with non-existent user returns 401."""
    response = await client.post(
        "/api/auth/login",
        json={"username": "nobody", "password": "somepass"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_health_endpoint(client):
    """Health endpoint returns ok status."""
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("ok", "degraded")
    assert "database" in data
    assert "redis" in data
