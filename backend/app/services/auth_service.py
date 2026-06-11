import logging
import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import bcrypt
import jwt
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status

from app.config import get_settings
from app.database import db

logger = logging.getLogger("soundwave.auth")
settings = get_settings()
BCRYPT_ROUNDS = 12
REFRESH_TOKEN_DAYS = 30


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    return bcrypt.hashpw(password_bytes, salt).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception as exc:
        logger.exception("Password verification error: %s", exc)
        return False


def _encode_access_token(user_id: str) -> tuple[str, datetime]:
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {"sub": user_id, "exp": expires, "jti": uuid4().hex, "type": "access"}
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, expires


async def create_token_pair(user_id: str) -> tuple[str, str]:
    """Create access JWT + long-lived refresh token, both persisted in DB."""
    access_token, expires = _encode_access_token(user_id)
    refresh_token = secrets.token_urlsafe(48)
    now = datetime.utcnow()
    refresh_expires = now + timedelta(days=REFRESH_TOKEN_DAYS)

    await db.auth_sessions.insert_one({
        "user_id": user_id,
        "token": access_token,
        "created_at": now,
        "expires_at": expires,
        "revoked_at": None,
    })
    await db.refresh_tokens.insert_one({
        "user_id": user_id,
        "token": refresh_token,
        "created_at": now,
        "expires_at": refresh_expires,
        "revoked_at": None,
    })
    logger.info("Created token pair for user %s (access + refresh)", user_id)
    return access_token, refresh_token


async def create_session_token(user_id: str) -> str:
    """Backward-compatible: access token only."""
    access, _refresh = await create_token_pair(user_id)
    return access


async def refresh_access_token(refresh_token: str) -> tuple[str, str]:
    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token required")

    row = await db.refresh_tokens.find_one({"token": refresh_token, "revoked_at": None})
    if not row:
        logger.warning("Refresh failed: token not found or revoked")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    expires_at = row.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", ""))
    if expires_at and expires_at < datetime.utcnow():
        logger.warning("Refresh failed: token expired for user %s", row.get("user_id"))
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

    user_id = str(row["user_id"])
    await db.refresh_tokens.update_one(
        {"token": refresh_token},
        {"$set": {"revoked_at": datetime.utcnow()}},
    )
    return await create_token_pair(user_id)


async def revoke_session(token: str) -> bool:
    if not token:
        return False
    result = await db.auth_sessions.update_one(
        {"token": token, "revoked_at": None},
        {"$set": {"revoked_at": datetime.utcnow()}},
    )
    logger.info("Revoked access session: %s", bool(result.modified_count))
    return bool(result.modified_count)


async def revoke_all_user_tokens(user_id: str) -> None:
    now = datetime.utcnow()
    await db.auth_sessions.update_one(
        {"user_id": user_id, "revoked_at": None},
        {"$set": {"revoked_at": now}},
    )
    await db.refresh_tokens.update_one(
        {"user_id": user_id, "revoked_at": None},
        {"$set": {"revoked_at": now}},
    )


async def _heal_missing_session(user_id: str, token: str, expires) -> None:
    """Recreate session row only when token row is completely missing (e.g. after DB migration)."""
    existing = await db.auth_sessions.find_one({"token": token})
    if existing:
        return

    now = datetime.utcnow()
    await db.auth_sessions.insert_one({
        "user_id": user_id,
        "token": token,
        "created_at": now,
        "expires_at": expires or (now + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)),
        "revoked_at": None,
    })
    logger.info("Healed missing auth session for user %s", user_id)


async def get_current_user(token: str):
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")

    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        user_id = payload.get("sub")
        exp = payload.get("exp")
        expires = datetime.fromtimestamp(exp, tz=timezone.utc) if exp else None
    except jwt.ExpiredSignatureError:
        logger.warning("Access token expired")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
    except jwt.InvalidTokenError as exc:
        logger.warning("Invalid token: %s", exc)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    session = await db.auth_sessions.find_one({"token": token, "revoked_at": None})
    if not session:
        revoked = await db.auth_sessions.find_one({"token": token})
        if revoked:
            logger.warning("Authentication failed: session revoked")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
        await _heal_missing_session(user_id, token, expires or datetime.utcnow() + timedelta(hours=1))
        session = await db.auth_sessions.find_one({"token": token, "revoked_at": None})
        if not session:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")

    try:
        lookup_id = ObjectId(user_id)
    except (InvalidId, TypeError):
        lookup_id = user_id

    user = await db.users.find_one({"_id": lookup_id})
    if not user:
        logger.warning("User not found for id: %s", user_id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    user["_id"] = str(user["_id"])
    return user
