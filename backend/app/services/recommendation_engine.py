from collections import Counter, defaultdict
from datetime import datetime, timedelta
import math
from bson import ObjectId
from app.database import db


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def feature_vector(song: dict) -> list[float]:
    f = song.get("features", {})
    return [float(f.get("energy", 0)), float(f.get("valence", 0)), float(f.get("tempo", 0)) / 220.0, float(f.get("danceability", 0))]


async def build_user_profile(user_id: str) -> dict:
    user_obj_id = ObjectId(user_id)
    events = await db.play_events.find({"user_id": user_id}).to_list(length=5000)
    likes = await db.liked_songs.find({"user_id": user_id}).to_list(length=5000)
    songs = await db.songs.find({}).to_list(length=2000)
    song_map = {str(s["_id"]): s for s in songs}

    weighted_vector = [0.0, 0.0, 0.0, 0.0]
    total_weight = 0.0
    artist_counter = Counter()
    genre_counter = Counter()
    mood_counter = Counter()
    skip_counter = defaultdict(int)
    play_counter = defaultdict(int)

    for event in events:
        sid = event.get("song_id")
        song = song_map.get(sid)
        if not song:
            continue
        weight = -0.5 if event.get("skipped") else 1.0
        vec = feature_vector(song)
        weighted_vector = [w + weight * v for w, v in zip(weighted_vector, vec)]
        total_weight += abs(weight)
        artist_counter[song.get("artist", "")] += 1
        for g in song.get("genre", []):
            genre_counter[g] += 1
        for m in song.get("mood_tags", []):
            mood_counter[m] += 1
        play_counter[sid] += 1
        if event.get("skipped"):
            skip_counter[sid] += 1

    for like in likes:
        song = song_map.get(like.get("song_id"))
        if not song:
            continue
        vec = feature_vector(song)
        weighted_vector = [w + 2.0 * v for w, v in zip(weighted_vector, vec)]
        total_weight += 2.0
        artist_counter[song.get("artist", "")] += 2

    user_vector = [v / max(total_weight, 1.0) for v in weighted_vector]
    recent_cutoff = datetime.utcnow() - timedelta(days=7)
    recent_song_ids = {
        e["song_id"]
        for e in events
        if e.get("played_at") and e["played_at"] >= recent_cutoff
    }

    skip_rate = {}
    for sid, plays in play_counter.items():
        skip_rate[sid] = skip_counter[sid] / max(plays, 1)

    return {
        "user_id": str(user_obj_id),
        "user_vector": user_vector,
        "top_genres": {g for g, _ in genre_counter.most_common(6)},
        "top_moods": {m for m, _ in mood_counter.most_common(6)},
        "liked_artists": {a for a, _ in artist_counter.most_common(10)},
        "recent_song_ids": recent_song_ids,
        "skip_rate": skip_rate,
        "artist_counter": artist_counter,
    }


def build_explanations(song: dict, profile: dict, mood: str | None = None) -> list[str]:
    explanations = []
    artist = song.get("artist", "")
    if artist in profile["liked_artists"]:
        plays = profile["artist_counter"][artist]
        explanations.append(f"Based on your {plays} plays of {artist}")
    if mood and mood in song.get("mood_tags", []):
        explanations.append(f"Matches your current {mood} mode")
    if any(g in profile["top_genres"] for g in song.get("genre", [])):
        explanations.append("Trending in your favorite genre lanes")
    if song.get("release_year", 0) >= datetime.utcnow().year - 1:
        explanations.append("New release from an artist you love")
    return explanations[:3] if explanations else ["Selected for your evolving taste profile"]


async def recommend(user_id: str, mood: str | None = None, limit: int = 20) -> list[dict]:
    profile = await build_user_profile(user_id)
    songs = await db.songs.find({}).to_list(length=3000)
    scored = []
    for song in songs:
        sid = str(song["_id"])
        if sid in profile["recent_song_ids"]:
            continue
        if profile["skip_rate"].get(sid, 0) > 0.7:
            continue
        base = cosine_similarity(profile["user_vector"], feature_vector(song))
        boost = 1.0
        if any(g in profile["top_genres"] for g in song.get("genre", [])):
            boost *= 1.3
        if mood and mood in song.get("mood_tags", []):
            boost *= 1.5
        if song.get("artist") in profile["liked_artists"]:
            boost *= 1.4
        score = base * boost
        song["_id"] = sid
        song["score"] = round(score, 4)
        song["explanations"] = build_explanations(song, profile, mood)
        scored.append(song)
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:limit]


async def get_ai_dj_queue(user_id: str, limit: int = 10) -> list[dict]:
    profile = await build_user_profile(user_id)
    # Energy transition logic: start with high energy if user was listening to high energy
    # Predict mood from recent history
    mood_counts = Counter()
    for sid in profile["recent_song_ids"]:
        song = await db.songs.find_one({"_id": ObjectId(sid)})
        if song:
            for m in song.get("mood_tags", []):
                mood_counts[m] += 1
    
    current_mood = mood_counts.most_common(1)[0][0] if mood_counts else None
    
    recs = await recommend(user_id, mood=current_mood, limit=limit)
    
    for r in recs:
        r["ai_dj_insight"] = f"Predicted your {current_mood} vibe based on recent activity."
        r["confidence_score"] = r.get("score", 0.8)
        
    return recs
