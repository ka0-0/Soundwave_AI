# Authentication & "Failed to Fetch" Fix Report

## Root Causes of "Failed to Fetch"

| # | Root Cause | Impact |
|---|------------|--------|
| 1 | **Backend not running** when login attempted | Browser `fetch()` throws `TypeError: Failed to fetch` |
| 2 | **No network error handling** in `api.js` | Raw browser message shown to users |
| 3 | **`refreshSession()` cleared tokens on ANY error** including network blips | Users forced to re-login after temporary outages |
| 4 | **Strict session DB check** without healing | Valid JWT rejected after DB hiccups |
| 5 | **CORS limited to `localhost:5173` only** | Access via `127.0.0.1:5173` caused silent CORS failures |
| 6 | **No retry logic** | Transient failures became permanent errors |
| 7 | **No refresh tokens** | Expired access tokens required full re-login |
| 8 | **No health endpoint** | Frontend couldn't distinguish offline vs auth errors |

## Fixes Applied

### Frontend (`src/utils/api.js`)
- `ApiError` class with codes: `NETWORK`, `SESSION_EXPIRED`, `UNAUTHORIZED`, `SERVER_ERROR`, `RATE_LIMIT`
- User-friendly messages (e.g. "Cannot reach the server. Make sure the backend is running on port 8000.")
- Automatic retry (2 attempts) on network failures
- Silent token refresh on 401 via `/auth/refresh`
- `checkBackendHealth()` for startup diagnostics
- Console logging for all API failures

### Frontend (`src/store/useAuthStore.js`)
- Stores `soundwave_refresh_token` in localStorage
- **Does NOT logout on network errors** — keeps cached user, shows offline banner
- Only clears tokens on true auth failures (after refresh attempt)
- Auto-loads workspace + preferences on login/refresh

### Backend Auth (`app/services/auth_service.py`)
- **Access + refresh token pairs** (30-day refresh lifetime)
- `POST /api/v1/auth/refresh` for silent renewal
- **Session healing** when JWT valid but session row missing (backend restart)
- Revoked sessions properly rejected (logout works)

### Backend Infrastructure
- `GET /api/v1/health` — database connectivity probe
- Request logging middleware
- Security headers middleware
- Expanded CORS origins

### User Workspace (`user_preferences`, searches, favorites, analyses, reports tables)
- Per-user isolated data in SQLite/MongoDB
- `GET /workspace/bootstrap` restores state on login
- Preferences (language, theme) persist in DB + localStorage

### Theme System (`globals.css`, `usePreferencesStore.js`, `AppLayout.jsx`)
- CSS variables for dark, light, high-contrast
- `--select-bg`, `--select-text`, `--input-bg` for readable dropdowns
- Theme + language selector in header
- Preferences sync to database on change

## Verification Checklist

- [x] Backend unit tests pass (7/7)
- [x] Registration creates user + workspace + token pair
- [x] Login returns access + refresh tokens
- [x] Logout revokes session
- [x] Refresh endpoint issues new token pair
- [x] Network errors no longer force logout
- [x] CORS includes 127.0.0.1

## How to Run

```powershell
# Terminal 1 — Backend (REQUIRED for login)
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open http://localhost:5173 — **both servers must be running**.

## Modified Files

**Backend:** `auth_service.py`, `auth.py` (routes), `schemas/auth.py`, `sqlite_db.py`, `database.py`, `main.py`, `config.py`, `workspace_service.py`, `routes/workspace.py`, `schemas/workspace.py`, `.env`, `.env.example`

**Frontend:** `utils/api.js`, `store/useAuthStore.js`, `store/useWorkspaceStore.js`, `store/usePreferencesStore.js`, `pages/Login.jsx`, `pages/Signup.jsx`, `components/layout/AppLayout.jsx`, `styles/globals.css`
