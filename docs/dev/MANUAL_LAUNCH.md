# Manual Launch — Development

## Prerequisites

- Python 3.12+
- Node.js 18+
- Redis

## Installing Redis (macOS)

```bash
brew install redis
```

````

## Backend Setup

```bash
cd server
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create `server/.env.dev`:

```env
DJANGO_PROJECT_NAME=Vita Performance
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=True
DJANGO_HOSTS=localhost,127.0.0.1
DJANGO_HOSTS_URLS=http://localhost:3000,http://127.0.0.1:3000
DJANGO_DB_URL=
REDIS_URL=redis://localhost:6379
```

> Leave `DJANGO_DB_URL` empty to use SQLite locally.

Run migrations:

```bash
python manage.py migrate
```

## Frontend Setup

```bash
cd client
npm install
```

Create `client/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

## Running — 3 Terminals Required

### Terminal 1 — Redis

```bash
redis-server
```

### Terminal 2 — Backend

```bash
cd server
source .venv/bin/activate
daphne -b 0.0.0.0 -p 8000 core.asgi:application
```

> ⚠️ Do not use `python manage.py runserver` — it does not support WebSockets.

### Terminal 3 — Frontend

```bash
cd client
npm run dev
```

## URLs

| Service     | URL                       |
| ----------- | ------------------------- |
| Frontend    | http://localhost:3000     |
| Backend API | http://localhost:8000/api |
| WebSocket   | ws://localhost:8000/ws    |

## Notes

- Realtime dashboard at `/dashboard/realtime` requires all 3 services running
- Redis handles both WebSocket channel layers and WS token caching
- JWT tokens are stored in HttpOnly cookies — not readable by JavaScript
````
