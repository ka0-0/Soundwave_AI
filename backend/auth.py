import json
import os
import secrets
from functools import wraps
from pathlib import Path
from urllib.parse import urljoin

import requests
import spotipy
from dotenv import load_dotenv
from flask import Blueprint, flash, redirect, request, session, url_for
from google_auth_oauthlib.flow import Flow
from spotipy.oauth2 import SpotifyOAuth

load_dotenv()

if os.getenv("FLASK_DEBUG", "true").lower() == "true" or os.getenv("ENV", "development") == "development":
    os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")

USERS_FILE = Path(__file__).resolve().parent / "users.json"
GOOGLE_SCOPES = ["openid", "https://www.googleapis.com/auth/userinfo.email"]
SPOTIFY_SCOPES = "user-read-email user-read-private"

auth_bp = Blueprint("auth", __name__)


def _normalize_gmail(gmail: str) -> str:
    return gmail.strip().lower()


def _user_key(username: str, gmail: str) -> str:
    return f"{username.strip()}_{_normalize_gmail(gmail)}"


def load_users() -> dict:
    if not USERS_FILE.exists():
        return {}
    with USERS_FILE.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def save_users(users: dict) -> None:
    with USERS_FILE.open("w", encoding="utf-8") as handle:
        json.dump(users, handle, indent=2)


def gmail_already_registered(gmail: str, users: dict | None = None) -> bool:
    users = users if users is not None else load_users()
    normalized = _normalize_gmail(gmail)
    return any(_normalize_gmail(data.get("gmail", "")) == normalized for data in users.values())


def register_user(username: str, gmail: str, password: str) -> tuple[bool, str]:
    username = username.strip()
    gmail = _normalize_gmail(gmail)

    if not username or not gmail or not password:
        return False, "All fields are required."
    if gmail_already_registered(gmail):
        return False, "This Gmail is already registered."

    users = load_users()
    key = _user_key(username, gmail)
    if key in users:
        return False, "This username and Gmail combination already exists."

    users[key] = {
        "username": username,
        "gmail": gmail,
        "password": password,
    }
    save_users(users)
    return True, "Account created successfully."


def authenticate_user(gmail: str, password: str) -> dict | None:
    gmail = _normalize_gmail(gmail)
    users = load_users()
    for key, data in users.items():
        if _normalize_gmail(data.get("gmail", "")) == gmail and data.get("password", "") == password:
            return {"key": key, **data}
    return None


def oauth_login_or_register(gmail: str, username: str) -> dict:
    gmail = _normalize_gmail(gmail)
    username = username.strip() or gmail.split("@")[0]
    users = load_users()

    for key, data in users.items():
        if _normalize_gmail(data.get("gmail", "")) == gmail:
            return {"key": key, **data}

    base_username = username
    counter = 1
    while _user_key(username, gmail) in users:
        username = f"{base_username}{counter}"
        counter += 1

    key = _user_key(username, gmail)
    users[key] = {
        "username": username,
        "gmail": gmail,
        "password": secrets.token_urlsafe(32),
    }
    save_users(users)
    return {"key": key, **users[key]}


def set_user_session(user: dict) -> None:
    session.permanent = True
    session["user_key"] = user["key"]
    session["username"] = user["username"]
    session["gmail"] = user["gmail"]


def clear_user_session() -> None:
    session.pop("user_key", None)
    session.pop("username", None)
    session.pop("gmail", None)


def get_logged_in_user() -> dict | None:
    if not session.get("gmail"):
        return None
    return {
        "user_key": session.get("user_key"),
        "username": session.get("username"),
        "gmail": session.get("gmail"),
    }


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not get_logged_in_user():
            flash("Please log in to continue.", "error")
            return redirect(url_for("login_page"))
        return view(*args, **kwargs)

    return wrapped


def _base_url() -> str:
    return os.getenv("FLASK_BASE_URL", "http://localhost:5000").rstrip("/")


def _google_redirect_uri() -> str:
    return urljoin(f"{_base_url()}/", "auth/google/callback")


def _spotify_redirect_uri() -> str:
    return urljoin(f"{_base_url()}/", "auth/spotify/callback")


def _google_flow() -> Flow:
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise ValueError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set.")

    return Flow.from_client_config(
        {
            "web": {
                "client_id": client_id,
                "client_secret": client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=GOOGLE_SCOPES,
        redirect_uri=_google_redirect_uri(),
    )


def _spotify_oauth() -> SpotifyOAuth:
    client_id = os.getenv("SPOTIFY_CLIENT_ID")
    client_secret = os.getenv("SPOTIFY_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise ValueError("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set.")

    return SpotifyOAuth(
        client_id=client_id,
        client_secret=client_secret,
        redirect_uri=_spotify_redirect_uri(),
        scope=SPOTIFY_SCOPES,
        cache_path=None,
        open_browser=False,
    )


@auth_bp.route("/signup", methods=["POST"])
def signup():
    if get_logged_in_user():
        return redirect(url_for("search"))

    username = request.form.get("username", "")
    gmail = request.form.get("gmail", "")
    password = request.form.get("password", "")
    success, message = register_user(username, gmail, password)
    if success:
        user = authenticate_user(gmail, password)
        set_user_session(user)
        flash(message, "success")
        return redirect(url_for("search"))
    flash(message, "error")
    return redirect(url_for("signup_page"))


@auth_bp.route("/login", methods=["POST"])
def login():
    if get_logged_in_user():
        return redirect(url_for("search"))

    gmail = request.form.get("gmail", "")
    password = request.form.get("password", "")
    user = authenticate_user(gmail, password)
    if user:
        set_user_session(user)
        flash(f"Welcome back, {user['username']}!", "success")
        return redirect(url_for("search"))
    flash("Invalid Gmail or password.", "error")
    return redirect(url_for("login_page"))


@auth_bp.route("/logout")
def logout():
    clear_user_session()
    flash("You have been logged out.", "success")
    return redirect(url_for("login_page"))


@auth_bp.route("/auth/google")
def google_login():
    try:
        flow = _google_flow()
        authorization_url, state = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            prompt="select_account",
        )
        session["google_oauth_state"] = state
        return redirect(authorization_url)
    except ValueError as exc:
        flash(str(exc), "error")
        return redirect(url_for("login_page"))


@auth_bp.route("/auth/google/callback")
def google_callback():
    state = session.pop("google_oauth_state", None)
    if not state or state != request.args.get("state"):
        flash("Google sign-in failed. Please try again.", "error")
        return redirect(url_for("login_page"))

    try:
        flow = _google_flow()
        flow.fetch_token(authorization_response=request.url)
        credentials = flow.credentials
        response = requests.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {credentials.token}"},
            timeout=10,
        )
        response.raise_for_status()
        profile = response.json()
        gmail = profile.get("email", "")
        username = profile.get("name") or gmail.split("@")[0]
        if not gmail:
            flash("Could not read Gmail from Google account.", "error")
            return redirect(url_for("login_page"))

        user = oauth_login_or_register(gmail=gmail, username=username)
        set_user_session(user)
        flash("Signed in with Google.", "success")
        return redirect(url_for("search"))
    except Exception:
        flash("Google sign-in failed. Please try again.", "error")
        return redirect(url_for("login_page"))


@auth_bp.route("/auth/spotify")
def spotify_login():
    try:
        oauth = _spotify_oauth()
        auth_url = oauth.get_authorize_url()
        return redirect(auth_url)
    except ValueError as exc:
        flash(str(exc), "error")
        return redirect(url_for("login_page"))


@auth_bp.route("/auth/spotify/callback")
def spotify_callback():
    code = request.args.get("code")
    if not code:
        flash("Spotify sign-in was cancelled.", "error")
        return redirect(url_for("login_page"))

    try:
        oauth = _spotify_oauth()
        token_info = oauth.get_access_token(code, as_dict=True)
        sp = spotipy.Spotify(auth=token_info["access_token"])
        profile = sp.current_user()
        gmail = profile.get("email", "")
        username = profile.get("display_name") or profile.get("id") or gmail.split("@")[0]
        if not gmail:
            flash("Could not read email from Spotify profile.", "error")
            return redirect(url_for("login_page"))

        user = oauth_login_or_register(gmail=gmail, username=username)
        set_user_session(user)
        flash("Signed in with Spotify.", "success")
        return redirect(url_for("search"))
    except Exception:
        flash("Spotify sign-in failed. Please try again.", "error")
        return redirect(url_for("login_page"))
