from __future__ import annotations
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=2, max_length=40)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Username must be at least 2 characters.")
        return value

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be 72 bytes or fewer.")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password_length(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be 72 bytes or fewer.")
        return value


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=10, max_length=512)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    user: UserProfile | None = None


class UserProfile(BaseModel):
    id: str
    email: EmailStr
    username: str
    avatar_url: str | None = None
    full_name: str | None = None
    age: int | None = None
    gender: str | None = None
    country: str | None = None
    bio: str | None = None
    favorite_genres: list[str] = Field(default_factory=list)
    favorite_artists: list[str] = Field(default_factory=list)
    created_at: datetime


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(None, max_length=100)
    username: str | None = Field(None, min_length=2, max_length=40)
    age: int | None = Field(None, ge=0, le=120)
    gender: str | None = Field(None, max_length=20)
    country: str | None = Field(None, max_length=100)
    bio: str | None = Field(None, max_length=500)
    favorite_genres: list[str] | None = None
    favorite_artists: list[str] | None = None
    avatar_url: str | None = None


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=8, max_length=128)
