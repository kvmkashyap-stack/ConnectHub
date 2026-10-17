# ConnectHub frontend

Responsive Next.js frontend for the ConnectHub FastAPI backend. Uses JavaScript, React, Lucide icons, and custom CSS (no UI kit required).

## Requirements
- Node.js 18.17+ (Node 20 LTS recommended for a stable Next.js 14 environment)
- ConnectHub FastAPI backend running at `http://127.0.0.1:8000`

## Run locally (Windows PowerShell)
From the `frontend` directory:

```powershell
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

Open http://localhost:3000. Set `NEXT_PUBLIC_API_URL` in `.env.local` if your backend uses another address. Restart Next.js after changing environment variables.

## Backend endpoints used
- `POST /users/register` (JSON: username, email, password, display_name)
- `POST /users/login` (form data: username, password; response: access_token)
- `GET /users/me` (Bearer token)
- `GET /posts?limit=20&offset=0`
- `POST /posts` (JSON: content)
- `POST /posts/{post_id}/like`, `DELETE /posts/{post_id}/like`
- `POST /posts/{post_id}/comments` (JSON: content)

Ensure FastAPI CORS allows `http://localhost:3000` and `http://127.0.0.1:3000` if you use both hostnames.

## Current scope
Authentication, responsive dashboard, post creation, feed retrieval, like/unlike, comment submission, search filtering, and responsive navigation are connected to the API. Stories, video/image upload, communities, bookmarks, trending analytics, and suggested-user discovery are clearly marked preview/coming soon because corresponding backend endpoints/storage were not part of the existing API. Demo preview posts are shown when signed out; after sign-in, the frontend requests live posts from the backend.
