# ConnectHub 🌐✨

**ConnectHub** is a next-generation social networking platform combining real-time human connection with live external streams from **X (Twitter)**, **Instagram Reels**, **Google Trends**, and **Live News**.

---

## 🚀 Key Features

* **Live Social Feed (Live X / Bluesky)**:
  * Public feeds from verified creators, actors, politicians, and tech innovators.
  * One-click refresh option for instant real-time updates.
* **Vertical Live Reels**:
  * Seamless vertical video player supporting direct MP4 streaming and responsive embeds (YouTube Shorts / PeerTube).
  * Gesture-based audio unlock to seamlessly bypass browser autoplay restrictions.
* **Interactive Stories**:
  * Story carousel with photo uploads and full-screen viewer.
* **Direct Messaging (Real-Time Chat)**:
  * Persistent conversations with pinned chat bar and Rocket launch send animation.
* **Live Trending Topics & Topic Feeds**:
  * Google Trends integration (India, US, and Worldwide).
  * Clicking any trend immediately fetches real-time match dispatches, sports updates, and fan reactions.
* **Live News Dispatches**:
  * Filterable breaking headlines from India and Worldwide via GNews & RSS.
* **Responsive Sidebar & Navigation**:
  * Collapsible sidebar toggle (`☰`) for a clean, distraction-free viewing experience.
* **Dark / Light Mode**:
  * Native theme toggle with persistent settings.

---

## 🛠️ Tech Stack

* **Frontend**: Next.js 14 (App Router), React 18, CSS Custom Properties, Lucide Icons
* **Backend**: FastAPI (Python 3.11+), Uvicorn, SQLAlchemy, Pydantic, HTTPX, SQLite
* **APIs & Feeds**: Bluesky AT Protocol, PeerTube API, Google Trends RSS, Google News RSS, Mastodon Public Timelines

---

## 🏃 Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Backend will be live at `http://127.0.0.1:8000` (API Docs: `http://127.0.0.1:8000/docs`).

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will be live at `http://localhost:3000`.

---

## 📄 License
MIT © 2026 ConnectHub
