import os
import sys

# Ensure backend directory is in sys.path so modules can always be imported
_backend_dir = os.path.dirname(os.path.abspath(__file__))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import text
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
import json
import jwt
from fastapi import WebSocket, WebSocketDisconnect

from auth import create_access_token, get_current_user_id
from auth import SECRET_KEY, ALGORITHM
from database import SessionLocal
from models.user import User
from models.social import Post, Comment, Like, Follow
from schemas.user import UserCreate, UserResponse, TokenResponse
from schemas.content import (
    PostCreate,
    PostResponse,
    CommentCreate,
    CommentResponse,
)
from models.chat import Conversation, ConversationMember, Message

from schemas.chat import (
    ConversationCreate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)

app = FastAPI(title="ConnectHub API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    password_hash = PasswordHash.recommended()
except Exception:
    import hashlib
    class _FallbackHasher:
        def hash(self, secret: str) -> str:
            return hashlib.sha256(secret.encode("utf-8")).hexdigest()
        def verify(self, secret: str, hashed: str) -> bool:
            return hashlib.sha256(secret.encode("utf-8")).hexdigest() == hashed
    password_hash = _FallbackHasher()


# ---------------- DATABASE ----------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


from live_feed import (
    fetch_live_news,
    fetch_live_trends,
    fetch_live_social,
    fetch_live_reels,
    fetch_live_topic_posts,
)

# ---------------- HOME & HEALTH ----------------

@app.get("/")
def home():
    return {"message": "Welcome to ConnectHub!"}


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected",
        }
    except Exception:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable",
        )


# ---------------- LIVE EXTERNAL CONTENT ----------------

@app.get("/api/live/news")
async def get_live_news_endpoint(region: str = "both", limit: int = 20):
    """Fetch live news from India and Worldwide via GNews API and RSS feeds"""
    return await fetch_live_news(region=region, limit=limit)


@app.get("/api/live/trends")
async def get_live_trends_endpoint(geo: str = "both"):
    """Fetch live Google Trends for India and Worldwide"""
    return await fetch_live_trends(geo=geo)


@app.get("/api/live/social-feed")
async def get_live_social_endpoint(category: str = "all", limit: int = 50):
    """Fetch live public social posts from VIPs across sports, cinema, politics & tech"""
    return await fetch_live_social(category=category, limit=limit)


@app.get("/api/live/reels")
async def get_live_reels_endpoint(limit: int = 15):
    """Fetch live vertical Reels from PeerTube and Instagram API"""
    return await fetch_live_reels(limit=limit)


@app.get("/api/live/topic-feed")
async def get_live_topic_endpoint(query: str, limit: int = 15):
    """Fetch live posts & breaking news for any trending topic or search query"""
    return await fetch_live_topic_posts(query=query, limit=limit)


# ---------------- AUTHENTICATION ----------------

@app.post(
    "/users/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    existing = db.scalar(
        select(User).where(
            (User.username == user_data.username)
            | (User.email == str(user_data.email))
        )
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Username or email already exists",
        )

    user = User(
        username=user_data.username,
        email=str(user_data.email),
        hashed_password=password_hash.hash(user_data.password),
        display_name=(user_data.display_name.strip() if user_data.display_name and user_data.display_name.strip() else user_data.username),
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Username or email already exists",
        )

    return user


@app.post("/users/login", response_model=TokenResponse)
def login_user(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # The OAuth2 form field is always named "username", but we accept
    # either the user's username or their email address in it.
    identifier = form_data.username.strip()

    user = db.scalar(
        select(User).where(
            (User.username == identifier) | (User.email == identifier)
        )
    )

    if not user or not password_hash.verify(
        form_data.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid username/email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {
        "access_token": create_access_token(user.id),
        "token_type": "bearer",
    }


@app.get("/users/me", response_model=UserResponse)
def get_my_profile(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")

    return user


@app.get("/users/{user_id}", response_model=UserResponse)
def get_user_profile(
    user_id: int,
    db: Session = Depends(get_db),
):
    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return user


# ---------------- POSTS ----------------

@app.post(
    "/posts",
    response_model=PostResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_post(
    post_data: PostCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    content = post_data.content.strip()

    if not content:
        raise HTTPException(status_code=422, detail="Post cannot be empty")

    post = Post(author_id=user_id, content=content)

    db.add(post)
    db.commit()
    db.refresh(post)

    return post


@app.get("/posts", response_model=list[PostResponse])
def get_posts(
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    if limit < 1 or limit > 100 or offset < 0:
        raise HTTPException(
            status_code=422,
            detail="Use limit 1-100 and a non-negative offset",
        )

    statement = (
        select(Post)
        .order_by(Post.created_at.desc(), Post.id.desc())
        .offset(offset)
        .limit(limit)
    )

    return db.scalars(statement).all()


@app.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    post = db.get(Post, post_id)

    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.author_id != user_id:
        raise HTTPException(
            status_code=403,
            detail="You can only delete your own posts",
        )

    # Delete dependent records first because their foreign keys
    # reference this post.
    db.query(Comment).filter(Comment.post_id == post_id).delete()
    db.query(Like).filter(Like.post_id == post_id).delete()
    db.delete(post)
    db.commit()


# ---------------- LIKES ----------------

@app.post("/posts/{post_id}/like", status_code=status.HTTP_201_CREATED)
def like_post(
    post_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if db.get(Post, post_id) is None:
        raise HTTPException(status_code=404, detail="Post not found")

    existing = db.scalar(
        select(Like).where(
            Like.user_id == user_id,
            Like.post_id == post_id,
        )
    )

    if existing:
        raise HTTPException(status_code=409, detail="Already liked")

    db.add(Like(user_id=user_id, post_id=post_id))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Already liked")

    return {"message": "Post liked"}


@app.delete("/posts/{post_id}/like", status_code=status.HTTP_204_NO_CONTENT)
def unlike_post(
    post_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    existing = db.scalar(
        select(Like).where(
            Like.user_id == user_id,
            Like.post_id == post_id,
        )
    )

    if existing is None:
        raise HTTPException(status_code=404, detail="Like not found")

    db.delete(existing)
    db.commit()


# ---------------- COMMENTS ----------------

@app.post(
    "/posts/{post_id}/comments",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    post_id: int,
    comment_data: CommentCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if db.get(Post, post_id) is None:
        raise HTTPException(status_code=404, detail="Post not found")

    content = comment_data.content.strip()

    if not content:
        raise HTTPException(status_code=422, detail="Comment cannot be empty")

    comment = Comment(
        post_id=post_id,
        author_id=user_id,
        content=content,
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    return comment


@app.get(
    "/posts/{post_id}/comments",
    response_model=list[CommentResponse],
)
def get_comments(
    post_id: int,
    db: Session = Depends(get_db),
):
    if db.get(Post, post_id) is None:
        raise HTTPException(status_code=404, detail="Post not found")

    statement = (
        select(Comment)
        .where(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc(), Comment.id.asc())
    )

    return db.scalars(statement).all()


# ---------------- FOLLOWING ----------------

@app.post("/users/{target_user_id}/follow")
def follow_user(
    target_user_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if user_id == target_user_id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    if db.get(User, target_user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.scalar(
        select(Follow).where(
            Follow.follower_id == user_id,
            Follow.following_id == target_user_id,
        )
    )

    if existing:
        raise HTTPException(status_code=409, detail="Already following")

    db.add(
        Follow(follower_id=user_id, following_id=target_user_id)
    )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Already following")

    return {"message": "User followed"}


@app.delete(
    "/users/{target_user_id}/follow",
    status_code=status.HTTP_204_NO_CONTENT,
)
def unfollow_user(
    target_user_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    existing = db.scalar(
        select(Follow).where(
            Follow.follower_id == user_id,
            Follow.following_id == target_user_id,
        )
    )

    if existing is None:
        raise HTTPException(status_code=404, detail="Follow not found")

    db.delete(existing)
    db.commit()


# ---------------- CHAT ----------------

@app.post(
    "/conversations",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_conversation(
    data: ConversationCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if user_id == data.recipient_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot start a conversation with yourself",
        )

    recipient = db.get(User, data.recipient_id)

    if recipient is None:
        raise HTTPException(
            status_code=404,
            detail="Recipient not found",
        )

    # Create the conversation and its two participants atomically.
    try:
        conversation = Conversation()
        db.add(conversation)
        db.flush()

        db.add_all([
            ConversationMember(
                conversation_id=conversation.id,
                user_id=user_id,
            ),
            ConversationMember(
                conversation_id=conversation.id,
                user_id=data.recipient_id,
            ),
        ])

        db.commit()
        db.refresh(conversation)

        return conversation

    except Exception:
        db.rollback()
        raise


@app.get(
    "/conversations",
    response_model=list[ConversationResponse],
)
def list_conversations(
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    statement = (
        select(Conversation)
        .join(
            ConversationMember,
            ConversationMember.conversation_id == Conversation.id,
        )
        .where(ConversationMember.user_id == user_id)
        .order_by(Conversation.created_at.desc())
    )

    return db.scalars(statement).all()


@app.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    conversation_id: int,
    data: MessageCreate,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    membership = db.scalar(
        select(ConversationMember).where(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id,
        )
    )

    if membership is None:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this conversation",
        )

    content = data.content.strip()

    if not content:
        raise HTTPException(
            status_code=422,
            detail="Message cannot be empty",
        )

    message = Message(
        conversation_id=conversation_id,
        sender_id=user_id,
        content=content,
    )

    db.add(message)
    db.commit()
    db.refresh(message)

    return message


@app.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
def get_messages(
    conversation_id: int,
    limit: int = 50,
    offset: int = 0,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    if limit < 1 or limit > 100 or offset < 0:
        raise HTTPException(
            status_code=422,
            detail="Use limit 1-100 and a non-negative offset",
        )

    membership = db.scalar(
        select(ConversationMember).where(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == user_id,
        )
    )

    if membership is None:
        raise HTTPException(
            status_code=403,
            detail="You are not a member of this conversation",
        )

    statement = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc(), Message.id.desc())
        .offset(offset)
        .limit(limit)
    )

    # Return newest messages first; the frontend can reverse them for display.
    return db.scalars(statement).all()


# ---------------- REAL-TIME CHAT ----------------

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, conversation_id: int, websocket: WebSocket):
        await websocket.accept()

        self.active_connections.setdefault(conversation_id, []).append(
            websocket
        )

    def disconnect(self, conversation_id: int, websocket: WebSocket):
        connections = self.active_connections.get(conversation_id, [])

        if websocket in connections:
            connections.remove(websocket)

        if not connections:
            self.active_connections.pop(conversation_id, None)

    async def broadcast(self, conversation_id: int, message: dict):
        connections = self.active_connections.get(conversation_id, [])

        for connection in connections.copy():
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(conversation_id, connection)


manager = ConnectionManager()


@app.websocket("/ws/chat/{conversation_id}")
async def websocket_chat(
    websocket: WebSocket,
    conversation_id: int,
):
    # 1. Authenticate the user using their JWT token.
    token = websocket.query_params.get("token")

    if not token:
        await websocket.close(code=1008)
        return

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        user_id = int(payload["sub"])

    except (jwt.InvalidTokenError, ValueError, KeyError, TypeError):
        await websocket.close(code=1008)
        return

    # 2. Confirm that the user belongs to this conversation.
    with SessionLocal() as db:
        membership = db.scalar(
            select(ConversationMember).where(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
            )
        )

        if membership is None:
            await websocket.close(code=1008)
            return

    # 3. Connect the authenticated user.
    await manager.connect(conversation_id, websocket)

    try:
        while True:
            raw_message = await websocket.receive_text()

            # Expect JSON such as {"content": "Hello!"}
            try:
                data = json.loads(raw_message)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "error": "Send a valid JSON message"
                })
                continue

            if not isinstance(data, dict):
                await websocket.send_json({
                    "error": "Message must be a JSON object"
                })
                continue

            content = data.get("content")

            if not isinstance(content, str):
                await websocket.send_json({
                    "error": "Content must be a string"
                })
                continue

            content = content.strip()

            if not content or len(content) > 5000:
                await websocket.send_json({
                    "error": "Message must contain 1-5000 characters"
                })
                continue

            # 4. Save the message before broadcasting it.
            with SessionLocal() as db:
                message = Message(
                    conversation_id=conversation_id,
                    sender_id=user_id,
                    content=content,
                )

                db.add(message)
                db.commit()
                db.refresh(message)

                response = {
                    "id": message.id,
                    "conversation_id": message.conversation_id,
                    "sender_id": message.sender_id,
                    "content": message.content,
                    "created_at": message.created_at.isoformat(),
                }

            # 5. Immediately send the message to connected members.
            await manager.broadcast(conversation_id, response)

    except WebSocketDisconnect:
        pass

    finally:
        manager.disconnect(conversation_id, websocket)