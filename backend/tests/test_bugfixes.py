import pytest
import uuid


@pytest.mark.asyncio
async def test_reply_notification_saved(client):
    """Verify that replying to a post successfully creates a notification in the DB."""
    # Register user A (author)
    reg_a = await client.post(
        "/api/auth/register",
        json={"username": "notif_author", "password": "testpass123", "display_name": "Author"},
    )
    assert reg_a.status_code == 200
    token_a = reg_a.json()["token"]
    user_a_id = reg_a.json()["user_id"]

    # Register user B (replier)
    reg_b = await client.post(
        "/api/auth/register",
        json={"username": "notif_replier", "password": "testpass123", "display_name": "Replier"},
    )
    assert reg_b.status_code == 200
    token_b = reg_b.json()["token"]

    # User A creates a post
    post_resp = await client.post(
        "/api/posts",
        json={"body": "Author's main post"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert post_resp.status_code == 200
    post_id = post_resp.json()["id"]

    # User B replies to User A's post
    reply_resp = await client.post(
        "/api/posts",
        json={"body": "Replier's comment", "parent_id": post_id},
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert reply_resp.status_code == 200

    # User A checks their notifications
    notif_resp = await client.get(
        "/api/notifications",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert notif_resp.status_code == 200
    notifications = notif_resp.json()
    
    # Assert notification of type 'reply' was created and saved
    reply_notifications = [n for n in notifications if n["type"] == "reply"]
    assert len(reply_notifications) == 1
    assert reply_notifications[0]["actor_username"] == "notif_replier"


@pytest.mark.asyncio
async def test_group_chat_unauthorized_access(client):
    """Verify that a non-participant cannot access group chat messages, participants, or post messages."""
    # Register user A (creator)
    reg_a = await client.post(
        "/api/auth/register",
        json={"username": "group_a", "password": "testpass123", "display_name": "Group A"},
    )
    token_a = reg_a.json()["token"]
    user_a_id = reg_a.json()["user_id"]

    # Register user B (participant)
    reg_b = await client.post(
        "/api/auth/register",
        json={"username": "group_b", "password": "testpass123", "display_name": "Group B"},
    )
    token_b = reg_b.json()["token"]
    user_b_id = reg_b.json()["user_id"]

    # Register user C (unauthorized attacker)
    reg_c = await client.post(
        "/api/auth/register",
        json={"username": "group_c", "password": "testpass123", "display_name": "Group C"},
    )
    token_c = reg_c.json()["token"]

    # User A creates a group chat including User B
    group_resp = await client.post(
        "/api/group-chats",
        json={"name": "Secret Group", "topic": "Top Secret", "participant_ids": [user_a_id, user_b_id]},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert group_resp.status_code == 200
    group_chat_id = group_resp.json()["id"]

    # User C (non-participant) tries to read messages -> should get empty list
    messages_resp = await client.get(
        f"/api/group-chats/{group_chat_id}/messages",
        headers={"Authorization": f"Bearer {token_c}"},
    )
    assert messages_resp.status_code == 200
    assert messages_resp.json() == []

    # User C tries to list participants -> should be blocked with 403
    parts_resp = await client.get(
        f"/api/group-chats/{group_chat_id}/participants",
        headers={"Authorization": f"Bearer {token_c}"},
    )
    assert parts_resp.status_code == 403

    # User C tries to post a message -> should be blocked with 403
    send_resp = await client.post(
        f"/api/group-chats/{group_chat_id}/messages",
        json={"body": "Hello spy"},
        headers={"Authorization": f"Bearer {token_c}"},
    )
    assert send_resp.status_code == 403

    # User A (participant) posts a message -> should succeed
    send_a_resp = await client.post(
        f"/api/group-chats/{group_chat_id}/messages",
        json={"body": "Hello B"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert send_a_resp.status_code == 200

    # User B (participant) reads messages -> should see User A's message
    messages_b_resp = await client.get(
        f"/api/group-chats/{group_chat_id}/messages",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert messages_b_resp.status_code == 200
    msgs = messages_b_resp.json()
    assert len(msgs) == 1
    assert msgs[0]["body"] == "Hello B"


@pytest.mark.asyncio
async def test_end_election_unauthorized(client):
    """Verify that ending an election requires authentication."""
    election_id = uuid.uuid4()
    resp = await client.post(f"/api/elections/{election_id}/end")
    assert resp.status_code in (401, 403)
