import logging
import sqlite3
from datetime import datetime
from fastapi import APIRouter, Header, HTTPException, status
from app.database import db
from app.schemas.auth import (
    LoginRequest, 
    RefreshRequest, 
    RegisterRequest, 
    TokenResponse, 
    UserProfile, 
    UpdateProfileRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest
)
from app.services.auth_service import (
    create_token_pair,
    get_current_user,
    hash_password,
    refresh_access_token,
    revoke_session,
    verify_password,
)
from app.services.google_auth_service import google_oauth_service
from app.services.workspace_service import initialize_user_workspace
from app.config import get_settings

logger = logging.getLogger("soundwave.auth.routes")
router = APIRouter(prefix="/auth", tags=["Auth"])
settings = get_settings()


@router.get("/google/login")
async def google_login():
    """Redirect to Google consent screen."""
    return RedirectResponse(google_oauth_service.get_login_url())


@router.get("/google/callback")
async def google_callback(code: str):
    """Exchange code for tokens and login/register user."""
    logger.info("Google callback received")
    
    # 1. Exchange code for tokens
    tokens = await google_oauth_service.get_tokens(code)
    access_token = tokens.get("access_token")
    if not access_token:
        logger.error("Failed to obtain access token from Google")
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=google_auth_failed")

    # 2. Get user info
    user_info = await google_oauth_service.get_user_info(access_token)
    if not user_info:
        logger.error("Failed to obtain user info from Google")
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=google_profile_failed")

    email = user_info.get("email")
    name = user_info.get("name")
    picture = user_info.get("picture")

    if not email:
        logger.error("Email not provided by Google")
        return RedirectResponse(f"{settings.FRONTEND_URL}/login?error=email_missing")

    # 3. Check if user exists, if not create
    user = await db.users.find_one({"email": email})
    if not user:
        logger.info(f"Creating new user via Google: {email}")
        doc = {
            "email": email,
            "username": name or email.split("@")[0],
            "password_hash": "", # No password for OAuth users
            "avatar_url": picture or "",
            "created_at": datetime.utcnow(),
            "preferences": {"themes": [], "moods": [], "genres": []},
            "oauth_provider": "google",
            "oauth_id": user_info.get("sub")
        }
        result = await db.users.insert_one(doc)
        user_id = str(result.inserted_id)
        await initialize_user_workspace(user_id)
    else:
        user_id = str(user["_id"])
        # Update profile picture if it changed
        if picture and user.get("avatar_url") != picture:
            await db.users.update_one({"_id": user["_id"]}, {"$set": {"avatar_url": picture}})

    # 4. Create token pair
    access, refresh = await create_token_pair(user_id)
    
    # 5. Redirect to frontend with tokens
    # Note: In production, you might want to use a more secure way to pass tokens (like cookies or a temporary session)
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback?access_token={access}&refresh_token={refresh}")


@router.post("/register", response_model=TokenResponse)
async def register(payload: RegisterRequest):
    """Register a new user with email, username, and password."""
    logger.info(f"Registration attempt for email: {payload.email}")
    
    # Validate input
    if len(payload.username) < 2:
        logger.warning(f"Registration failed: username too short for {payload.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Username must be at least 2 characters long"
        )
    
    if len(payload.password) < 8:
        logger.warning(f"Registration failed: password too short for {payload.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Password must be at least 8 characters long"
        )
    
    # Check if email already exists
    exists = await db.users.find_one({"email": payload.email})
    if exists:
        logger.warning(f"Registration failed: email already exists - {payload.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Email already registered. Please use a different email or login."
        )
    
    # Check if username already exists
    username_exists = await db.users.find_one({"username": payload.username})
    if username_exists:
        logger.warning(f"Registration failed: username already exists - {payload.username}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Username already taken. Please choose a different username."
        )
    
    # Create user
    try:
        doc = {
            "email": payload.email,
            "username": payload.username,
            "password_hash": hash_password(payload.password),
            "avatar_url": "",
            "created_at": datetime.utcnow(),
            "preferences": {"themes": [], "moods": [], "genres": []},
        }
        result = await db.users.insert_one(doc)
        user_id = str(result.inserted_id)
        await initialize_user_workspace(user_id)
        access, refresh = await create_token_pair(user_id)
        logger.info(f"User registered successfully: {payload.email}")
        
        user_profile = UserProfile(
            id=user_id,
            email=doc["email"],
            username=doc["username"],
            avatar_url=doc.get("avatar_url"),
            full_name=doc.get("full_name"),
            age=doc.get("age"),
            gender=doc.get("gender"),
            country=doc.get("country"),
            bio=doc.get("bio"),
            favorite_genres=doc.get("favorite_genres", []),
            favorite_artists=doc.get("favorite_artists", []),
            created_at=doc["created_at"],
        )
        return TokenResponse(access_token=access, refresh_token=refresh, user=user_profile)
    except sqlite3.IntegrityError:
        logger.warning(f"Registration failed: duplicate email race - {payload.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Please use a different email or login.",
        )
    except Exception as e:
        logger.exception(f"Registration error for {payload.email}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Registration failed. Please try again later."
        )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    """Login a user with email and password."""
    logger.info(f"Login attempt for email: {payload.email}")
    
    # Find user by email
    user = await db.users.find_one({"email": payload.email})
    if not user:
        logger.warning(f"Login failed: user not found - {payload.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid email or password"
        )
    
    # Verify password
    if not verify_password(payload.password, user["password_hash"]):
        logger.warning(f"Login failed: invalid password for {payload.email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid email or password"
        )
    
    access, refresh = await create_token_pair(str(user["_id"]))
    logger.info(f"User logged in successfully: {payload.email}")
    
    user_profile = UserProfile(
        id=str(user["_id"]),
        email=user["email"],
        username=user["username"],
        avatar_url=user.get("avatar_url"),
        full_name=user.get("full_name"),
        age=user.get("age"),
        gender=user.get("gender"),
        country=user.get("country"),
        bio=user.get("bio"),
        favorite_genres=user.get("favorite_genres", []),
        favorite_artists=user.get("favorite_artists", []),
        created_at=user["created_at"],
    )
    return TokenResponse(access_token=access, refresh_token=refresh, user=user_profile)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(payload: RefreshRequest):
    access, refresh = await refresh_access_token(payload.refresh_token)
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(authorization: str = Header(default="")):
    token = authorization.replace("Bearer ", "")
    await revoke_session(token)
    return None


@router.get("/me", response_model=UserProfile)
async def me(authorization: str = Header(default="")):
    """Get current user profile."""
    if not authorization:
        logger.warning("Get profile failed: no authorization header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Authorization header required"
        )
    
    token = authorization.replace("Bearer ", "")
    user = await get_current_user(token)
    logger.debug(f"Profile retrieved for user: {user['email']}")
    
    return UserProfile(
        id=str(user["_id"]),
        email=user["email"],
        username=user["username"],
        avatar_url=user.get("avatar_url"),
        full_name=user.get("full_name"),
        age=user.get("age"),
        gender=user.get("gender"),
        country=user.get("country"),
        bio=user.get("bio"),
        favorite_genres=user.get("favorite_genres", []),
        favorite_artists=user.get("favorite_artists", []),
        created_at=user["created_at"],
    )


@router.put("/me", response_model=UserProfile)
async def update_me(payload: UpdateProfileRequest, authorization: str = Header(default="")):
    """Update current user profile."""
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authorization header required")
    
    token = authorization.replace("Bearer ", "")
    user = await get_current_user(token)
    user_id = user["_id"]

    update_data = {}
    payload_dict = payload.dict(exclude_unset=True)
    
    logger.info(f"Updating profile for user {user['email']} with payload: {payload_dict}")
    
    for k, v in payload_dict.items():
        update_data[k] = v

    if not update_data:
        return UserProfile(
            id=str(user["_id"]),
            email=user["email"],
            username=user["username"],
            avatar_url=user.get("avatar_url"),
            full_name=user.get("full_name"),
            age=user.get("age"),
            gender=user.get("gender"),
            country=user.get("country"),
            bio=user.get("bio"),
            favorite_genres=user.get("favorite_genres", []),
            favorite_artists=user.get("favorite_artists", []),
            created_at=user["created_at"],
        )

    # If username is changing, check for uniqueness
    if "username" in update_data and update_data["username"] != user["username"]:
        exists = await db.users.find_one({"username": update_data["username"]})
        if exists:
            logger.warning(f"Username update failed: {update_data['username']} already taken")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

    try:
        await db.users.update_one({"_id": user_id}, {"$set": update_data})
        
        # Get updated user
        updated_user = await db.users.find_one({"_id": user_id})
        logger.info(f"Profile updated successfully for user {user['email']}")
        
        return UserProfile(
            id=str(updated_user["_id"]),
            email=updated_user["email"],
            username=updated_user["username"],
            avatar_url=updated_user.get("avatar_url"),
            full_name=updated_user.get("full_name"),
            age=updated_user.get("age"),
            gender=updated_user.get("gender"),
            country=updated_user.get("country"),
            bio=updated_user.get("bio"),
            favorite_genres=updated_user.get("favorite_genres", []),
            favorite_artists=updated_user.get("favorite_artists", []),
            created_at=updated_user["created_at"],
        )
    except Exception as e:
        logger.exception(f"CRITICAL: Profile update failed for user {user['email']}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database update failed: {type(e).__name__}: {str(e)}"
        )


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    """Request a password reset email."""
    user = await db.users.find_one({"email": payload.email})
    if not user:
        # Don't reveal if user exists for security
        return {"message": "If an account exists, a reset link has been sent."}
    
    # Generate a random 32-char token
    import secrets
    token = secrets.token_urlsafe(32)
    now = datetime.utcnow()
    expires = now + timedelta(hours=1)
    
    await db.password_resets.insert_one({
        "user_id": str(user["_id"]),
        "token": token,
        "created_at": now,
        "expires_at": expires,
        "used_at": None
    })
    
    logger.info(f"Password reset requested for {payload.email}. Token: {token}")
    # In a real app, send an email here. For now, we'll log it.
    return {"message": "If an account exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    """Reset password using a token."""
    reset = await db.password_resets.find_one({
        "token": payload.token,
        "used_at": None
    })
    
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    expires_at = reset["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at.replace("Z", ""))
    
    if expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    user_id = reset["user_id"]
    try:
        lookup_id = ObjectId(user_id)
    except:
        lookup_id = user_id
        
    await db.users.update_one(
        {"_id": lookup_id},
        {"$set": {"password_hash": hash_password(payload.new_password)}}
    )
    
    await db.password_resets.update_one(
        {"_id": reset["_id"]},
        {"$set": {"used_at": datetime.utcnow()}}
    )
    
    logger.info(f"Password reset successful for user_id: {user_id}")
    return {"message": "Password reset successful"}
