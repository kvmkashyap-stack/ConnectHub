import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import main
from database import Base
from models.user import User
from models.social import Post, Comment, Like, Follow
from models.chat import Conversation, ConversationMember, Message


@pytest.fixture
def client():
    # Use a separate in-memory SQLite database for tests.
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    TestingSessionLocal = sessionmaker(
        bind=test_engine,
        autoflush=False,
        autocommit=False,
    )

    Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[main.get_db] = override_get_db

    try:
        with TestClient(main.app) as test_client:
            yield test_client
    finally:
        main.app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=test_engine)
        test_engine.dispose()


def test_register_user(client):
    response = client.post(
        "/users/register",
        json={
            "username": "testuser",
            "email": "testuser@example.com",
            "password": "TestPassword123!",
            "display_name": "Test User",
        },
    )

    assert response.status_code == 201
    assert response.json()["username"] == "testuser"
    assert "hashed_password" not in response.json()


def test_login_and_get_profile(client):
    client.post(
        "/users/register",
        json={
            "username": "loginuser",
            "email": "loginuser@example.com",
            "password": "TestPassword123!",
            "display_name": "Login User",
        },
    )

    response = client.post(
        "/users/login",
        data={
            "username": "loginuser",
            "password": "TestPassword123!",
        },
    )

    assert response.status_code == 200
    token = response.json()["access_token"]

    profile = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert profile.status_code == 200
    assert profile.json()["username"] == "loginuser"


def test_create_post(client):
    client.post(
        "/users/register",
        json={
            "username": "postuser",
            "email": "postuser@example.com",
            "password": "TestPassword123!",
            "display_name": "Post User",
        },
    )

    login = client.post(
        "/users/login",
        data={
            "username": "postuser",
            "password": "TestPassword123!",
        },
    )

    token = login.json()["access_token"]

    response = client.post(
        "/posts",
        json={"content": "My first automated test post"},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 201
    assert response.json()["content"] == "My first automated test post"
    assert response.json()["author_id"] > 0



def test_duplicate_registration_returns_409(client):
    user_data = {
        "username": "duplicateuser",
        "email": "duplicate@example.com",
        "password": "TestPassword123!",
        "display_name": "Duplicate User",
    }

    first = client.post("/users/register", json=user_data)
    second = client.post("/users/register", json=user_data)

    assert first.status_code == 201
    assert second.status_code == 409


def test_protected_profile_without_token_returns_401(client):
    response = client.get("/users/me")

    assert response.status_code == 401


def create_test_user(client, username):
    user_data = {
        "username": username,
        "email": f"{username}@example.com",
        "password": "TestPassword123!",
        "display_name": username.title(),
    }

    response = client.post("/users/register", json=user_data)
    assert response.status_code == 201

    login = client.post(
        "/users/login",
        data={
            "username": username,
            "password": "TestPassword123!",
        },
    )
    assert login.status_code == 200

    return login.json()["access_token"]


def test_like_and_unlike_post(client):
    token = create_test_user(client, "likeuser")
    headers = {"Authorization": f"Bearer {token}"}

    post = client.post(
        "/posts",
        json={"content": "Testing likes"},
        headers=headers,
    )
    assert post.status_code == 201
    post_id = post.json()["id"]

    like = client.post(f"/posts/{post_id}/like", headers=headers)
    assert like.status_code in (200, 201, 204)

    unlike = client.delete(f"/posts/{post_id}/like", headers=headers)
    assert unlike.status_code in (200, 204)



def test_create_and_get_comments(client):
    token = create_test_user(client, "commentuser")
    headers = {"Authorization": f"Bearer {token}"}

    post = client.post(
        "/posts",
        json={"content": "Post for comment testing"},
        headers=headers,
    )
    assert post.status_code == 201
    post_id = post.json()["id"]

    comment = client.post(
        f"/posts/{post_id}/comments",
        json={"content": "This is a test comment"},
        headers=headers,
    )
    assert comment.status_code == 201

    comments = client.get(f"/posts/{post_id}/comments")
    assert comments.status_code == 200
    assert any(
        item["content"] == "This is a test comment"
        for item in comments.json()
    )


def test_follow_and_unfollow_user(client):
    follower_token = create_test_user(client, "followeruser")
    create_test_user(client, "followeduser")

    headers = {"Authorization": f"Bearer {follower_token}"}

    # Find the second user's ID.
    users = client.get("/users/2")
    assert users.status_code == 200
    followed_user_id = users.json()["id"]

    follow = client.post(
        f"/users/{followed_user_id}/follow",
        headers=headers,
    )
    assert follow.status_code in (200, 201, 204)

    unfollow = client.delete(
        f"/users/{followed_user_id}/follow",
        headers=headers,
    )
    assert unfollow.status_code in (200, 204)



def test_create_conversation_and_send_message(client):
    sender_token = create_test_user(client, "chatsender")
    recipient_token = create_test_user(client, "chatrecipient")

    sender_headers = {
        "Authorization": f"Bearer {sender_token}"
    }
    recipient_headers = {
        "Authorization": f"Bearer {recipient_token}"
    }

    # Get the recipient's actual user ID.
    recipient = client.get("/users/me", headers=recipient_headers)
    assert recipient.status_code == 200
    recipient_id = recipient.json()["id"]

    # Create a conversation.
    conversation = client.post(
        "/conversations",
        json={"recipient_id": recipient_id},
        headers=sender_headers,
    )
    assert conversation.status_code in (200, 201)
    conversation_id = conversation.json()["id"]

    # Send a message.
    message = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"content": "Hello from an automated test!"},
        headers=sender_headers,
    )
    assert message.status_code in (200, 201)
    assert message.json()["content"] == "Hello from an automated test!"

    # Retrieve persisted messages.
    messages = client.get(
        f"/conversations/{conversation_id}/messages",
        headers=recipient_headers,
    )
    assert messages.status_code == 200
    assert any(
        item["content"] == "Hello from an automated test!"
        for item in messages.json()
    )



def test_non_member_cannot_read_conversation(client):
    sender_token = create_test_user(client, "private_sender")
    recipient_token = create_test_user(client, "private_recipient")
    outsider_token = create_test_user(client, "chat_outsider")

    sender_headers = {
        "Authorization": f"Bearer {sender_token}"
    }
    outsider_headers = {
        "Authorization": f"Bearer {outsider_token}"
    }

    recipient = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {recipient_token}"},
    )
    recipient_id = recipient.json()["id"]

    conversation = client.post(
        "/conversations",
        json={"recipient_id": recipient_id},
        headers=sender_headers,
    )
    assert conversation.status_code in (200, 201)
    conversation_id = conversation.json()["id"]

    response = client.get(
        f"/conversations/{conversation_id}/messages",
        headers=outsider_headers,
    )

    assert response.status_code == 403
