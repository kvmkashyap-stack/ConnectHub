# ConnectHub 🌐✨
### Enterprise-Grade Next-Gen Hybrid Social Media Platform

ConnectHub is an end-to-end social networking platform engineered to merge **traditional user-generated content (UGC)** with **real-time live streaming dispatches** from global networks—including **X (Twitter)**, **Bluesky**, **PeerTube & Instagram Reels**, **Google Trends**, and **Live Global News**.

Built with a modern decoupled architecture using **Next.js 14**, **FastAPI**, **SQLAlchemy**, and an **asynchronous multi-stream ingestion pipeline**.

---

## 🏛️ End-to-End System Design Architecture

```mermaid
flowchart TD
    subgraph ClientLayer ["1. Client Tier (Next.js 14 Frontend)"]
        Browser["Desktop & Mobile Web Browsers"]
        UI_Components["React 18 Component Hierarchy<br/>• Feed & Live X Engine<br/>• ReelPlayer (Audio-Unlocked)<br/>• Real-Time Chat & Rocket Composer<br/>• Stories & Explore Discovery"]
        LocalState["State Management<br/>• React Hooks + Context API<br/>• LocalStorage Cache<br/>• Audio Unlock Gesture Handler"]
        Browser --> UI_Components --> LocalState
    end

    subgraph GatewayLayer ["2. API & Ingestion Gateway"]
        ReverseProxy["HTTP / WebSocket Gateway<br/>CORS Enabled · Port 8000"]
        FastAPI_Core["FastAPI High-Performance Engine<br/>Asynchronous Request Handlers"]
        JWT_Auth["Auth & Security Engine<br/>JWT Bearer Verification · PasswordHash"]
        ReverseProxy --> FastAPI_Core
        FastAPI_Core --> JWT_Auth
    end

    subgraph ServiceLayer ["3. Core Application & Pipeline Services"]
        UGC_Service["UGC & Social Graph Engine<br/>Posts · Comments · Likes · Follows"]
        Chat_Service["Direct Messaging Engine<br/>Conversations · Members · Messages"]
        LiveFeed_Service["Live Feed Aggregation Pipeline<br/>(Parallel Async Ingestion via HTTPX)"]
    end

    subgraph LiveEngines ["4. Real-Time External Feed Connectors"]
        X_Engine["X & Bluesky Engine<br/>• Bluesky AT Protocol<br/>• Optional X API v2<br/>• Mastodon Federated Timelines"]
        Reels_Engine["Reels & Short Video Engine<br/>• PeerTube Fragmented MP4<br/>• YouTube Shorts Embeds<br/>• Instagram Graph API"]
        Trends_Engine["Google Trends Ingestion<br/>• Real-time Traffic RSS<br/>• Geo Filters (India / Global)"]
        News_Engine["Live News Dispatcher<br/>• Google News RSS Engine<br/>• GNews API Integration"]
        Topic_Engine["Dynamic Topic Engine<br/>• Live Query Match Dispatches<br/>• Sports & Breaking Event Sync"]
    end

    subgraph DataLayer ["5. Persistence & In-Memory Storage"]
        CacheStore["In-Memory High-Speed Cache<br/>Keyed TTL · Stale-While-Revalidate Fallback"]
        RelationalDB[("Relational Database<br/>SQLite / PostgreSQL<br/>SQLAlchemy ORM")]
    end

    LocalState -- "REST API / JSON" --> ReverseProxy
    LocalState -. "WebSocket Streams" .-> ReverseProxy

    FastAPI_Core --> UGC_Service
    FastAPI_Core --> Chat_Service
    FastAPI_Core --> LiveFeed_Service

    LiveFeed_Service --> X_Engine
    LiveFeed_Service --> Reels_Engine
    LiveFeed_Service --> Trends_Engine
    LiveFeed_Service --> News_Engine
    LiveFeed_Service --> Topic_Engine

    LiveFeed_Service <--> CacheStore
    UGC_Service <--> RelationalDB
    Chat_Service <--> RelationalDB
```

---

## ⚡ Core System Workflows & Data Flows

### 1. Live Feed Ingestion & Caching Strategy
ConnectHub uses non-blocking asynchronous I/O (`asyncio.gather` with `httpx.AsyncClient`) to poll upstream feeds in parallel without degrading server response times.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client Browser
    participant API as FastAPI Gateway
    participant Cache as In-Memory Cache (TTL)
    participant Upstream as External Sources (X / Reels / Trends / News)
    participant Fallback as Stale Cache Recovery

    User->>API: GET /api/live/social-feed?category=all
    API->>Cache: Lookup cached payload (Key: social_all_25)
    alt Cache Hit (Within TTL)
        Cache-->>API: Return cached JSON payload
        API-->>User: 200 OK (Instant Response)
    else Cache Miss / Expired
        API->>Upstream: Asynchronous Parallel Ingestion (Bluesky, X, Mastodon, Celeb News)
        alt Upstream Responds Successfully
            Upstream-->>API: Raw dispatches & media URLs
            API->>API: Normalize schemas & role badges
            API->>Cache: Store in cache with fresh TTL (180s - 300s)
            API-->>User: 200 OK (Fresh Payload)
        else All Upstreams Fail / Rate-Limited
            API->>Fallback: Fetch last known good stale data
            Fallback-->>API: Stale cached payload
            API-->>User: 200 OK (Graceful Degradation)
        end
    end
```

### 2. Vertical Reels Player & Audio-Unlock Pipeline
Modern browsers block autoplay with sound unless initiated by a direct user gesture. ConnectHub addresses this with a hybrid media engine:

```mermaid
flowchart LR
    ReelItem["Reel Item Ingestion"] --> CheckPlayer{"playerType Resolution"}
    CheckPlayer -->|"Direct MP4 Available"| NativeVideo["playerType = 'video'<br/>Native HTML5 Video Tag"]
    CheckPlayer -->|"YouTube / PeerTube Embed"| EmbedIframe["playerType = 'iframe'<br/>Responsive Secured Iframe"]

    NativeVideo --> GestureGate["User Tap Play Overlay (Gesture Event)"]
    EmbedIframe --> GestureGate

    GestureGate --> UnmuteAction["Execute: v.muted = false; v.volume = 1.0; v.play()<br/>Append autoplay=1&mute=0 to iframe"]
    UnmuteAction --> ActivePlayback["Seamless High-Fidelity Audio & Video Playback"]
```

---

## 🗄️ Database Schema & Data Models

The relational persistence tier is powered by **SQLAlchemy** with relational integrity, foreign key cascading, and indexed member lookups.

```mermaid
erDiagram
    USERS ||--o{ POSTS : "authors"
    USERS ||--o{ COMMENTS : "writes"
    USERS ||--o{ LIKES : "creates"
    USERS ||--o{ FOLLOWS : "follows"
    USERS ||--o{ CONVERSATION_MEMBERS : "participates"
    USERS ||--o{ MESSAGES : "sends"

    CONVERSATIONS ||--o{ CONVERSATION_MEMBERS : "contains"
    CONVERSATIONS ||--o{ MESSAGES : "holds"

    POSTS ||--o{ COMMENTS : "receives"
    POSTS ||--o{ LIKES : "accumulates"

    USERS {
        int id PK
        string username UK
        string email UK
        string hashed_password
        string display_name
        string bio
        string avatar_url
        datetime created_at
    }

    POSTS {
        int id PK
        int author_id FK
        text content
        string image_url
        string video_url
        string tags
        datetime created_at
    }

    COMMENTS {
        int id PK
        int post_id FK
        int user_id FK
        text content
        datetime created_at
    }

    LIKES {
        int id PK
        int post_id FK
        int user_id FK
        datetime created_at
    }

    FOLLOWS {
        int id PK
        int follower_id FK
        int followed_id FK
        datetime created_at
    }

    CONVERSATIONS {
        int id PK
        string title
        boolean is_group
        datetime created_at
    }

    CONVERSATION_MEMBERS {
        int id PK
        int conversation_id FK
        int user_id FK
        datetime joined_at
    }

    MESSAGES {
        int id PK
        int conversation_id FK
        int sender_id FK
        text content
        string media_url
        datetime created_at
    }
```

---

## 🧩 Component Architecture (Frontend)

```
frontend/
├── app/
│   ├── globals.css          # Design system, responsive CSS Grid/Flexbox, animations
│   ├── layout.js            # Root HTML layout with ThemeProvider & font loading
│   ├── page.js              # Central orchestrator: Sidebar, Feed, Navigation, Live Feeds
│   └── icon.png             # Circular branded favicon
├── components/
│   ├── BookmarksView.js     # Saved bookmarks repository
│   ├── CommunitiesView.js   # Focused interest hubs (Build in Public, AI Creators, etc.)
│   ├── ComposeModal.js      # Global quick-compose dialog
│   ├── EmojiPicker.js       # Lightweight native emoji selector
│   ├── ExploreView.js       # Instagram-style discover grid and trending hashtags
│   ├── FollowsModal.js      # Modal displaying followers and following graphs
│   ├── LiveNewsView.js      # Real-time multi-region news explorer with live refresh
│   ├── MediaModal.js        # Fullscreen media lightbox viewer
│   ├── MessagesView.js      # Direct messaging interface with pinned chat bar & Rocket button
│   ├── NotificationsView.js # Interactive notification activity center
│   ├── ProfileView.js       # User portfolio, statistics, and timeline
│   ├── ReelPlayer.js        # Audio-unlocked vertical video engine
│   ├── ReelsView.js         # TikTok/Reels vertical feed controller
│   ├── SettingsView.js      # Profile, security, and interface configuration
│   ├── StoryCreator.js      # Clean photo story publisher
│   ├── StoryViewer.js       # Fullscreen auto-advancing story carousel
│   └── ThemeContext.js      # Dark/Light system state provider
└── lib/
    └── api.js               # Centralized asynchronous HTTP client with JWT injection
```

---

## 📡 API Reference & Integration Points

| Endpoint | Method | Description | Cache Strategy |
| :--- | :--- | :--- | :--- |
| `/api/live/social-feed` | `GET` | Fetches live posts from verified actors, politicians, and tech innovators via Bluesky & Mastodon. | In-memory TTL (180s) |
| `/api/live/reels` | `GET` | Aggregates vertical video streams from PeerTube instances, YouTube Shorts, and Instagram. | In-memory TTL (300s) |
| `/api/live/trends` | `GET` | Ingests real-time Google Trends dispatches for India, US, or worldwide. | In-memory TTL (600s) |
| `/api/live/topic-feed` | `GET` | Queries live match dispatches, sports events, and fan conversations for any search query. | In-memory TTL (180s) |
| `/api/live/news` | `GET` | Real-time verified headlines filtered by region (`IN`, `US`, `both`). | In-memory TTL (300s) |
| `/users/register` | `POST` | Registers a new user account with hashed password storage. | Database |
| `/users/login` | `POST` | Authenticates credentials and issues signed JWT bearer token. | OAuth2 Password |
| `/posts/` | `GET` / `POST` | Fetches timeline posts or publishes a new UGC post with attachments. | Relational DB |
| `/ws/chat/{user_id}` | `WebSocket` | Real-time bidirectional socket for instant messaging. | Stateful Socket |

---

## 🔒 Security & Performance Specifications

1. **Token-Based Authentication**:
   - Industry-standard **JWT (JSON Web Tokens)** using `HS256` signature algorithm.
   - Credentials hashed using recommended **Argon2 / Bcrypt** key-derivation functions (`pwdlib`).
2. **CORS Hardening**:
   - Explicit domain whitelisting configured via `CORSMiddleware`.
3. **Resilience & Fault Tolerance**:
   - Stale-while-revalidate pattern guarantees 0% downtime even if third-party RSS or social APIs experience temporary outages.
4. **Client-Side Optimization**:
   - Zero layout shifts using CSS Grid constraints and explicit aspect ratios (`9/16` for Reels).
   - Dynamic modular compilation via Next.js App Router for sub-100ms client transitions.

---

## 🚀 Deployment & Installation

### Prerequisites
* **Node.js**: v18.17+ or v20+
* **Python**: v3.11+
* **Git**

### Installation

#### 1. Clone Repository
```bash
git clone https://github.com/kvmkashyap-stack/ConnectHub.git
cd ConnectHub
```

#### 2. Backend Setup
```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Run FastAPI server
uvicorn main:app --reload --port 8000
```
API Documentation will be live at: **`http://127.0.0.1:8000/docs`**

#### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
Application interface will be live at: **`http://localhost:3000`**

---

## 📜 License
Released under the **MIT License**. Copyright © 2026 ConnectHub.
