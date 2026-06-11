import os
from datetime import timedelta

from dotenv import load_dotenv
from flask import Flask, redirect, render_template, request, session, url_for

from auth import auth_bp, get_logged_in_user
from google_auth import google_callback, google_login_redirect
from spotify_search import get_lyrics, get_vibe_songs, search_song

load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "replace-me-with-a-strong-secret")
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=7)
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"
app.register_blueprint(auth_bp)


@app.route("/")
def index():
    if get_logged_in_user() or session_get_google_user():
        return redirect(url_for("search"))
    return redirect(url_for("login_page"))


def session_get_google_user():
    return session.get("google_user")


@app.route("/home")
def home():
    return redirect(url_for("search"))


@app.route("/login", methods=["GET"])
def login_page():
    if get_logged_in_user() or session_get_google_user():
        return redirect(url_for("search"))
    return render_template("login.html")


@app.route("/signup", methods=["GET"])
def signup_page():
    if get_logged_in_user() or session_get_google_user():
        return redirect(url_for("search"))
    return render_template("signup.html")


@app.route("/search", methods=["GET", "POST"])
def search():
    search_results = []
    vibe_results = []
    lyrics = ""
    song_name = ""
    if request.method == "POST":
        song_name = request.form.get("song_name")
        search_results = search_song(song_name, limit=5)
        if search_results:
            top_track_id = search_results[0]['id']
            top_artist = search_results[0]['artist']
            vibe_results = get_vibe_songs(top_track_id, limit=10)
            lyrics = get_lyrics(song_name, top_artist)
    return render_template("search.html", search_results=search_results, vibe_results=vibe_results, lyrics=lyrics, song_name=song_name)


@app.route("/login/google")
def login_google():
    return google_login_redirect()


@app.route("/callback/google")
def callback_google():
    return google_callback()


if __name__ == "__main__":
    port = int(os.getenv("FLASK_PORT", "5000"))
    app.run(debug=os.getenv("FLASK_DEBUG", "true").lower() == "true", port=port)
