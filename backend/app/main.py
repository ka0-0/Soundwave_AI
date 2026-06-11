import logging
import time

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings
from app.database import db, mongo_active, redis_active
from app.middleware.security import RateLimitMiddleware
from app.routes import analysis, analytics, auth, discover, playlists, recommendations, songs, workspace, avatars

settings = get_settings()
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("soundwave.api")

app = FastAPI(title=settings.APP_NAME)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Our engineers have been notified."},
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        try:
            response = await call_next(request)
            ms = (time.perf_counter() - start) * 1000
            logger.info("%s %s -> %s (%.1fms)", request.method, request.url.path, response.status_code, ms)
            return response
        except Exception as exc:
            ms = (time.perf_counter() - start) * 1000
            logger.exception("%s %s FAILED (%.1fms): %s", request.method, request.url.path, ms, exc)
            raise


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware, limit=60, window=60)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_PREFIX, tags=["Auth"])
app.include_router(discover.router, prefix=settings.API_V1_PREFIX)
app.include_router(workspace.router, prefix=settings.API_V1_PREFIX)
app.include_router(analysis.router, prefix=settings.API_V1_PREFIX)
app.include_router(songs.router, prefix=settings.API_V1_PREFIX)
app.include_router(playlists.router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics.router, prefix=settings.API_V1_PREFIX)
app.include_router(recommendations.router, prefix=settings.API_V1_PREFIX)
app.include_router(avatars.router, prefix=settings.API_V1_PREFIX)


@app.on_event("startup")
async def startup_validation():
    """Validate backend setup on startup."""
    logger.info("=" * 60)
    logger.info("SOUNDWAVE AI API - Starting up...")
    logger.info("=" * 60)
    
    # Check 1: Verify auth routes are registered
    auth_routes = [r.path for r in auth.router.routes]
    logger.info("[CHECK] Auth routes in router: %s", auth_routes)
    
    expected_auth_routes = ["/register", "/login", "/refresh", "/logout", "/me"]
    for route in expected_auth_routes:
        full_path = f"{settings.API_V1_PREFIX}/auth{route}"
        if full_path not in [f"{settings.API_V1_PREFIX}{p}" for p in auth_routes]:
            logger.error("[CHECK] MISSING auth route: %s", full_path)
        else:
            logger.info("[CHECK] ✓ Auth route found: %s", full_path)
    
    # Check 2: Database connectivity
    try:
        if mongo_active:
            await db.users.find_one({})
            logger.info("[CHECK] ✓ MongoDB connection active")
        else:
            await db.users.count_documents({})
            logger.info("[CHECK] ✓ SQLite fallback connection active")
    except Exception as exc:
        logger.error("[CHECK] ✗ Database connection failed: %s", exc)
    
    # Check 3: Redis connectivity (if configured)
    if redis_active:
        try:
            await redis.ping()
            logger.info("[CHECK] ✓ Redis connection active")
        except Exception as exc:
            logger.warning("[CHECK] ✗ Redis ping failed: %s", exc)
    else:
        logger.info("[CHECK] - Redis not configured (using in-memory fallback)")
    
    logger.info("=" * 60)
    logger.info("STARTUP VALIDATION COMPLETE")
    logger.info("API Prefix: %s", settings.API_V1_PREFIX)
    logger.info("CORS Origins: %s", settings.CORS_ORIGINS)
    logger.info("=" * 60)


@app.get("/")
async def root(request: Request):
    # If someone hits the backend port directly in a browser, send them to the frontend
    accept = request.headers.get("accept", "")
    if "text/html" in accept:
        return RedirectResponse(url=settings.FRONTEND_URL, status_code=302)
    return {"app": settings.APP_NAME, "status": "online"}


@app.get(f"{settings.API_V1_PREFIX}/health")
async def health():
    db_ok = False
    try:
        if mongo_active:
            await db.users.find_one({})
        else:
            await db.users.count_documents({})
        db_ok = True
    except Exception as exc:
        logger.warning("Health check database probe failed: %s", exc)
    return {
        "online": True,
        "database": db_ok,
        "mongo": mongo_active,
        "redis": redis_active,
        "app": settings.APP_NAME,
    }

# Sync reload trigger comment
