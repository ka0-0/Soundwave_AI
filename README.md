# SOUNDWAVE AI

Production-grade full-stack AI-powered music analytics and recommendation platform with cinematic 3D storytelling.

## Stack
- Frontend: React 18, Vite, Tailwind, Framer Motion, GSAP + ScrollTrigger, Lenis, R3F/Three.js, Recharts, Zustand, Tone.js
- Backend: FastAPI, MongoDB + Motor, Redis, JWT auth, recommendation engine with cosine similarity

## Project Structure
```text
soundwave-ai/
  frontend/
  backend/
  docker-compose.yml
```

## 1) Local Setup

### Prerequisites
- Node.js 20+
- Python 3.11+
- MongoDB
- Redis

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```
Frontend runs at `http://localhost:5173`.

### Backend
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```
Backend runs at `http://localhost:8000`.

### Seed Data (50 songs)
```bash
cd backend
python seed_data.py
```

## 2) Docker Setup
```bash
cp backend/.env.example backend/.env
docker compose up
```
Starts MongoDB, Redis, and FastAPI backend.

## 3) Environment Variables

### Frontend (`frontend/.env`)
- `VITE_API_BASE_URL`
- `VITE_APP_NAME`

### Backend (`backend/.env`)
- `APP_NAME`
- `ENV`
- `API_V1_PREFIX`
- `CORS_ORIGINS`
- `MONGO_URI`
- `MONGO_DB`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_ALGORITHM`
- `JWT_EXPIRE_MINUTES`

## 4) API Surface
- Auth: register, login, me
- Songs: list/detail/play/skip/like
- Playlists: CRUD + add/remove songs
- Analytics: listening time, top artists/genres, heatmap, streaks, mood distribution
- Recommendations: personal, mood, nostalgia, smart queue

## 5) Production Notes
- Move secrets to vault/secret manager.
- Add rate limiting and API gateway.
- Enable HTTPS and strict CORS.
- Add observability (OpenTelemetry, Sentry, Prometheus).
- Add worker queue for heavy recommendation jobs.
