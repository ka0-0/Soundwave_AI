import logging
import random
import sqlite3
import json
from pathlib import Path
from datetime import datetime, timedelta
import pymongo
import redis
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from redis.asyncio import Redis as AsyncRedis
from app.config import get_settings
from app.sqlite_db import SQLiteDB, SQLiteCollection

logger = logging.getLogger("soundwave.database")
settings = get_settings()

# Connection probes
def check_mongo_connection(uri: str) -> bool:
    try:
        c = pymongo.MongoClient(uri, serverSelectionTimeoutMS=1500)
        c.admin.command("ping")
        return True
    except Exception:
        return False

def check_redis_connection(url: str) -> bool:
    try:
        r = redis.Redis.from_url(url, socket_timeout=1.5)
        r.ping()
        return True
    except Exception:
        return False

# Initialize actual connections or mock based on presence
mongo_active = check_mongo_connection(settings.MONGO_URI)
redis_active = check_redis_connection(settings.REDIS_URL)

# Mock Redis (kept for cache fallback)
class MockRedis:
    def __init__(self):
        self.data = {}

    async def get(self, key):
        return self.data.get(key)

    async def setex(self, key, time, value):
        self.data[key] = value
        return True

    async def set(self, key, value):
        self.data[key] = value
        return True

    async def delete(self, key):
        self.data.pop(key, None)
        return True

    async def keys(self, pattern="*"):
        return list(self.data.keys())

    async def ping(self):
        return True

# Export bindings
if mongo_active:
    logger.info("Connected to MongoDB at %s", settings.MONGO_URI)
    mongo_client = AsyncIOMotorClient(settings.MONGO_URI)
    db = mongo_client[settings.MONGO_DB]
else:
    logger.warning("MongoDB connection failed! Falling back to persistent SQLite database.")
    sqlite_path = Path(__file__).resolve().parents[1] / "soundwave.db"
    sqlite_db = SQLiteDB(str(sqlite_path))
    
    # Create wrapper to match MongoDB interface
    class SQLiteDBWrapper:
        def __init__(self, sqlite_db):
            self._sqlite_db = sqlite_db
            self.songs = SQLiteCollection(sqlite_db, "songs")
            self.play_events = SQLiteCollection(sqlite_db, "play_events")
            self.liked_songs = SQLiteCollection(sqlite_db, "liked_songs")
            self.playlists = SQLiteCollection(sqlite_db, "playlists")
            self.users = SQLiteCollection(sqlite_db, "users")
            self.ai_avatars = SQLiteCollection(sqlite_db, "ai_avatars")
            self.auth_sessions = SQLiteCollection(sqlite_db, "auth_sessions")
            self.analysis_requests = SQLiteCollection(sqlite_db, "analysis_requests")
            self.refresh_tokens = SQLiteCollection(sqlite_db, "refresh_tokens")
            self.user_preferences = SQLiteCollection(sqlite_db, "user_preferences")
            self.user_searches = SQLiteCollection(sqlite_db, "user_searches")
            self.music_analyses = SQLiteCollection(sqlite_db, "music_analyses")
            self.saved_reports = SQLiteCollection(sqlite_db, "saved_reports")
            self.saved_songs = SQLiteCollection(sqlite_db, "saved_songs")
            self.recently_played = SQLiteCollection(sqlite_db, "recently_played")
            self.recommendations = SQLiteCollection(sqlite_db, "recommendations")
            self.password_resets = SQLiteCollection(sqlite_db, "password_resets")
            self.favorites = SQLiteCollection(sqlite_db, "favorites")
        
        def __getitem__(self, name):
            return getattr(self, name)
    
    db = SQLiteDBWrapper(sqlite_db)

if redis_active:
    logger.info("Connected to Redis at %s", settings.REDIS_URL)
    redis = AsyncRedis.from_url(settings.REDIS_URL, decode_responses=True)
else:
    logger.warning("Redis connection failed! Falling back to stable local cache.")
    redis = MockRedis()

async def get_db() -> AsyncIOMotorDatabase:
    return db
