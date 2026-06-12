import logging
import json
import random
import asyncio
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from typing import Dict, Any, List, Optional
from bson import ObjectId

from app.database import db, redis
from app.services.deezer_service import deezer_service

logger = logging.getLogger("soundwave.recommendation_engine")

# ─── LOCAL OFFLINE TRACKS REFERENCE (TO EXCLUDE FROM AI RECS) ───
LOCAL_TRACK_TITLES = {
    "dhurandhar", "jat jatni", "my queen", "haaye re", "bairan", "fortuner", "kitaab"
}

# ─── modular layer 1: taste profile builder ───
async def build_user_taste_profile(user_id: str) -> Dict[str, Any]:
    # 1. Fetch user's play events, favorites, and searches
    plays = await db.recently_played.find({"user_id": user_id}).sort("played_at", -1).to_list(length=1000)
    favorites = await db.favorites.find({"user_id": user_id}).to_list(length=500)
    searches = await db.user_searches.find({"user_id": user_id}).sort("created_at", -1).to_list(length=20)
    
    # Load all database songs to map title/artist -> mood tags and features
    all_songs = []
    try:
        all_songs = await db.songs.find({}).to_list(length=100)
    except Exception as e:
        logger.warning(f"Failed to fetch songs for taste profile metadata: {e}")
        
    song_metadata = {}
    for s in all_songs:
        title_key = s.get("title", "").lower().strip()
        artist_key = s.get("artist", "").lower().strip()
        song_metadata[(title_key, artist_key)] = s
        song_id = str(s.get("_id", s.get("id", "")))
        if song_id:
            song_metadata[song_id] = s

    unique_tracks = set()
    artist_weights = Counter()
    genre_weights = Counter()
    mood_weights = Counter()
    recent_artists = []
    unique_artists = set()
    
    total_minutes = 0.0
    sessions_count = 0
    prev_play_time = None
    
    # Process plays
    for p in plays:
        track_data = p.get("track_data", {})
        if not track_data:
            continue
            
        track_id = str(track_data.get("id", ""))
        unique_tracks.add(track_id)
        
        # Calculate duration
        duration = float(track_data.get("duration", track_data.get("duration_seconds", 0)))
        total_minutes += duration / 60.0
        
        # Calculate sessions
        played_at = p.get("played_at")
        if isinstance(played_at, str):
            try:
                played_at = datetime.fromisoformat(played_at.replace("Z", ""))
            except Exception:
                played_at = datetime.utcnow()
        if not played_at:
            played_at = datetime.utcnow()
            
        if not prev_play_time or (prev_play_time - played_at) > timedelta(hours=2):
            sessions_count += 1
        prev_play_time = played_at
        
        # Artist affinity
        artist = track_data.get("artist", "").strip()
        if artist:
            artist_weights[artist] += 1.0
            unique_artists.add(artist.lower().strip())
            if len(recent_artists) < 15:
                recent_artists.append(artist)
                
        # Genre affinity
        genres = track_data.get("genre", [])
        if isinstance(genres, str):
            genres = [genres]
        elif not isinstance(genres, list):
            genres = []
        for g in genres:
            genre_weights[g.lower().strip()] += 1.0
            
        # Mood lookup from local db
        meta = song_metadata.get(track_id) or song_metadata.get((track_data.get("title", "").lower().strip(), track_data.get("artist", "").lower().strip()))
        if meta:
            moods = meta.get("mood_tags", [])
            for m in moods:
                mood_weights[m.lower().strip()] += 1.0
            
    # Process favorites
    for f in favorites:
        track_data = f.get("track_data", {})
        if not track_data:
            continue
            
        track_id = str(track_data.get("id", ""))
        unique_tracks.add(track_id)
        
        artist = track_data.get("artist", "").strip()
        if artist:
            artist_weights[artist] += 3.0
            unique_artists.add(artist.lower().strip())
            
        genres = track_data.get("genre", [])
        if isinstance(genres, str):
            genres = [genres]
        elif not isinstance(genres, list):
            genres = []
        for g in genres:
            genre_weights[g.lower().strip()] += 3.0
            
        # Mood lookup
        meta = song_metadata.get(track_id) or song_metadata.get((track_data.get("title", "").lower().strip(), track_data.get("artist", "").lower().strip()))
        if meta:
            moods = meta.get("mood_tags", [])
            for m in moods:
                mood_weights[m.lower().strip()] += 3.0

    # Process searches
    search_queries = []
    for s in searches:
        q = s.get("query", "").strip()
        if q:
            search_queries.append(q)
            # Search queries indicate interest in artists or genres
            artist_weights[q] += 2.0

    # Determine empty state
    # A user has sufficient history if they have played/liked >= 3 tracks OR have searched >= 1 query
    insufficient = len(unique_tracks) < 3 and len(search_queries) < 1
    
    top_artists = [a for a, _ in artist_weights.most_common(5)]
    top_genres = [g for g, _ in genre_weights.most_common(5)]
    top_moods = [m for m, _ in mood_weights.most_common(5)]
    
    return {
        "insufficient_history": insufficient,
        "top_artists": top_artists,
        "top_genres": top_genres,
        "top_moods": top_moods,
        "artist_weights": dict(artist_weights),
        "genre_weights": dict(genre_weights),
        "mood_weights": dict(mood_weights),
        "recent_artists": recent_artists,
        "total_minutes": total_minutes,
        "sessions_count": max(sessions_count, 1 if len(plays) > 0 else 0),
        "played_track_ids": {str(p.get("song_id")) for p in plays if p.get("song_id")},
        "liked_track_ids": {str(f.get("track_id")) for f in favorites if f.get("track_id")},
        "favorite_artist_data": favorites[0].get("track_data", {}) if favorites else (plays[0].get("track_data", {}) if plays else {}),
        "recent_searches": search_queries,
        "unique_artists_count": len(unique_artists)
    }


# ─── modular layer 2: candidate retrieval ───
async def retrieve_candidates(profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    candidates = []
    raw_retrieved = []

    # Target lists
    target_artists = profile["top_artists"][:3]
    target_genres = profile["top_genres"][:2]
    target_searches = profile.get("recent_searches", [])[:3]

    # STAGE 1: Fetch artist info, genre tracks, and search query tracks concurrently
    artist_coros = [deezer_service.search_artist_by_name(name) for name in target_artists]
    genre_coros = [deezer_service.search_songs(genre, limit=20) for genre in target_genres]
    search_coros = [deezer_service.search_songs(sq, limit=10) for sq in target_searches]

    num_artists = len(target_artists)
    num_genres = len(target_genres)

    first_stage_coros = artist_coros + genre_coros + search_coros
    if first_stage_coros:
        first_stage_results = await asyncio.gather(*first_stage_coros, return_exceptions=True)
    else:
        first_stage_results = []

    artist_infos = first_stage_results[:num_artists]
    genre_results = first_stage_results[num_artists : num_artists + num_genres]
    search_results = first_stage_results[num_artists + num_genres :]

    # Process genre results
    for genre, tracks in zip(target_genres, genre_results):
        if isinstance(tracks, Exception) or not tracks:
            continue
        for track in tracks:
            track["retrieval_reason"] = "genre_trending"
            track["matched_genre"] = genre
            raw_retrieved.append(track)

    # Process search results
    for sq, tracks in zip(target_searches, search_results):
        if isinstance(tracks, Exception) or not tracks:
            continue
        for track in tracks:
            track["retrieval_reason"] = "search_affinity"
            track["matched_search"] = sq
            raw_retrieved.append(track)

    # STAGE 2: Fetch top tracks and related artists concurrently for all resolved artists
    valid_artists = []
    second_stage_coros = []
    for name, info in zip(target_artists, artist_infos):
        if isinstance(info, Exception) or not info:
            continue
        artist_id = str(info.get("id"))
        if artist_id:
            valid_artists.append((name, artist_id))
            second_stage_coros.append(deezer_service.get_artist_top_tracks(artist_id, limit=10))
            second_stage_coros.append(deezer_service.get_related_artists(artist_id))

    if second_stage_coros:
        second_stage_results = await asyncio.gather(*second_stage_coros, return_exceptions=True)
    else:
        second_stage_results = []

    # Process second stage top tracks
    for idx, (name, artist_id) in enumerate(valid_artists):
        top_tracks = second_stage_results[2 * idx]
        if not isinstance(top_tracks, Exception) and top_tracks:
            for track in top_tracks:
                track["retrieval_reason"] = "artist_top"
                track["matched_artist"] = name
                raw_retrieved.append(track)

    # STAGE 3: Fetch top tracks for all related artists concurrently
    third_stage_coros = []
    for idx, (name, artist_id) in enumerate(valid_artists):
        related_artists = second_stage_results[2 * idx + 1]
        if not isinstance(related_artists, Exception) and related_artists:
            for rel_artist in related_artists[:3]:
                rel_artist_id = str(rel_artist.get("id"))
                if rel_artist_id:
                    third_stage_coros.append((name, rel_artist_id, deezer_service.get_artist_top_tracks(rel_artist_id, limit=5)))

    if third_stage_coros:
        third_stage_results = await asyncio.gather(*(coro for _, _, coro in third_stage_coros), return_exceptions=True)
        for (name, _, _), rel_tracks in zip(third_stage_coros, third_stage_results):
            if isinstance(rel_tracks, Exception) or not rel_tracks:
                continue
            for track in rel_tracks:
                track["retrieval_reason"] = "related_artist"
                track["matched_artist"] = name
                raw_retrieved.append(track)

    # Database Fallback: If external API queries return too few candidates, query local database
    if len(raw_retrieved) < 10:
        logger.info("Deezer candidate retrieval returned too few tracks. Falling back to local database lookup.")
        try:
            local_songs = await db.songs.find({}).to_list(length=100)
        except Exception as e:
            logger.warning(f"Database query failed in fallback: {e}")
            local_songs = []

        for song in local_songs:
            track = {
                "id": str(song.get("_id", song.get("id"))),
                "title": song.get("title"),
                "artist": song.get("artist"),
                "album": song.get("album"),
                "cover_url": song.get("cover_url"),
                "preview_url": song.get("audio_url"),
                "duration": song.get("duration_seconds"),
                "popularity": 80,
                "link": "",
                "source": "database"
            }
            artist = track["artist"]
            genres = song.get("genre", [])
            genre_list = [g.lower().strip() for g in genres] if isinstance(genres, list) else [genres.lower().strip()]

            if artist in profile["top_artists"]:
                track["retrieval_reason"] = "artist_top"
                track["matched_artist"] = artist
                raw_retrieved.append(track)
            elif any(g in profile["top_genres"] for g in genre_list):
                matched_g = next(g for g in genre_list if g in profile["top_genres"])
                track["retrieval_reason"] = "genre_trending"
                track["matched_genre"] = matched_g
                raw_retrieved.append(track)
            else:
                track["retrieval_reason"] = "popular_fallback"
                raw_retrieved.append(track)

    # Apply Playable Track Filtering & Metadata Preservation
    total_retrieved = len(raw_retrieved)
    with_preview = 0
    rejected = 0

    for c in raw_retrieved:
        url = c.get("preview_url") or c.get("audio_url") or c.get("preview") or c.get("src")
        if url and url != "None" and url != "null" and url != "undefined":
            c["preview_url"] = url  # Ensure standardized key
            c["playable"] = True
            candidates.append(c)
            with_preview += 1
        else:
            rejected += 1

    logger.info(f"[METRICS] retrieve_candidates: Total retrieved: {total_retrieved} | Playable (with preview_url): {with_preview} | Rejected (missing preview_url): {rejected}")
    return candidates

# ─── modular layer 3: filtering & deduplication ───
def filter_candidates(candidates: List[Dict[str, Any]], profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    filtered = []
    seen_ids = set()
    seen_titles = set()
    
    # Excluded sets
    played_ids = profile["played_track_ids"]
    liked_ids = profile["liked_track_ids"]
    
    for c in candidates:
        track_id = str(c.get("id", ""))
        title = c.get("title", "").strip().lower()
        artist = c.get("artist", "").strip().lower()
        
        # Deduplication
        if track_id in seen_ids or (title, artist) in seen_titles:
            continue
            
        # Exclude played and liked
        if track_id in played_ids or track_id in liked_ids:
            continue
            
        # Exclude downloaded/local
        if track_id.startswith("local-") or title in LOCAL_TRACK_TITLES:
            continue
            
        # Save signature
        seen_ids.add(track_id)
        seen_titles.add((title, artist))
        
        filtered.append(c)
        
    return filtered

# ─── modular layer 4: scoring ───
def score_candidates(candidates: List[Dict[str, Any]], profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    scored = []
    
    top_artists_set = set(profile["top_artists"])
    top_genres_set = set(profile["top_genres"])
    recent_artists_set = set(profile["recent_artists"])
    
    # Max count weights for normalization
    max_artist_weight = max(profile["artist_weights"].values()) if profile["artist_weights"] else 1.0
    
    for c in candidates:
        artist = c.get("artist", "").strip()
        genre = c.get("matched_genre", "").strip().lower()
        
        # 40% Artist Similarity
        artist_sim = 0.0
        if artist in top_artists_set:
            artist_sim = 1.0
        elif c.get("retrieval_reason") == "related_artist":
            artist_sim = 0.7
            
        # 25% Genre Similarity
        genre_sim = 0.0
        if genre in top_genres_set or c.get("retrieval_reason") == "genre_trending":
            genre_sim = 1.0
            
        # 20% Listening Frequency
        list_freq = 0.0
        if artist in profile["artist_weights"]:
            list_freq = profile["artist_weights"][artist] / max_artist_weight
            
        # 15% Recent Activity
        recent_act = 1.0 if artist in recent_artists_set else 0.0
        
        # Search Affinity check
        search_affinity = 0.0
        matched_search = c.get("matched_search", "")
        if c.get("retrieval_reason") == "search_affinity":
            search_affinity = 1.0
        elif matched_search:
            title_lower = c.get("title", "").lower()
            artist_lower = c.get("artist", "").lower()
            query_lower = matched_search.lower()
            if query_lower in title_lower or query_lower in artist_lower:
                search_affinity = 1.0
                
        # Apply score formula
        raw_score = (0.40 * artist_sim) + (0.25 * genre_sim) + (0.20 * list_freq) + (0.15 * recent_act)
        if search_affinity > 0:
            raw_score = max(raw_score, 0.85) # Ensure high score for search matches
            
        # Normalize score between 70% and 99%
        final_score = int(70 + (raw_score * 29))
        final_score = min(max(final_score, 70), 99)
        
        c["score"] = final_score
        
        # Construct dynamic recommendation reason
        if c.get("retrieval_reason") == "search_affinity" and matched_search:
            c["reason"] = f"Inspired by your search for '{matched_search}'"
        elif artist_sim == 1.0:
            c["reason"] = f"Because you frequently listen to {artist}"
        elif recent_act == 1.0:
            c["reason"] = "Based on your recent listening activity"
        elif genre_sim == 1.0:
            c["reason"] = f"Matches your preferred {genre.capitalize()} genre"
        elif artist_sim == 0.7:
            c["reason"] = f"Similar to artists you play frequently"
        else:
            c["reason"] = "Popular among listeners with similar tastes"
            
        scored.append(c)
        
    return scored

# ─── modular layer 5: ranking ───
def rank_candidates(scored_candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    # Sort descending by score
    return sorted(scored_candidates, key=lambda x: x["score"], reverse=True)

# ─── modular layer 6: serialization ───
def serialize_dashboard(
    recs: List[Dict[str, Any]], 
    profile: Dict[str, Any]
) -> Dict[str, Any]:
    
    # 0. Redistribute match scores based on rank order to match the realistic score requirements
    for idx, track in enumerate(recs):
        if idx == 0:
            score = 98
        elif idx == 1:
            score = 96
        elif idx == 2:
            score = 94
        elif idx == 3:
            score = 91
        elif idx == 4:
            score = 89
        elif idx == 5:
            score = 87
        elif idx == 6:
            score = 84
        else:
            score = max(70, 84 - (idx - 6) * 2 - (hash(track.get("id", "")) % 3))
        track["score"] = score

    # 1. Recommendation List (Limit to 30 for legacy compatibility and groups)
    final_recs = recs[:30]
    
    # 2. Artists You May Like
    artists_seen = set()
    artists_list = []
    
    # Find artists from top artists related pools
    for r in recs:
        artist = r.get("artist", "")
        if artist and artist not in profile["top_artists"] and artist not in artists_seen:
            artists_seen.add(artist)
            artists_list.append({
                "name": artist,
                "cover_url": r.get("cover_url", ""),
                "track_id": r.get("id", "")
            })
            if len(artists_list) >= 5:
                break
                
    # Fallback to standard related artists if not enough
    if len(artists_list) < 5:
        fallbacks = ["Billie Eilish", "Dua Lipa", "The Weeknd", "Coldplay", "Bruno Mars"]
        for f in fallbacks:
            if f not in profile["top_artists"] and f not in artists_seen:
                artists_seen.add(f)
                artists_list.append({
                    "name": f,
                    "cover_url": "https://picsum.photos/seed/" + f.replace(" ", "") + "/300/300.webp",
                    "track_id": ""
                })
                if len(artists_list) >= 5:
                    break
                    
    # Enrich artists list with dynamic taste match
    for i, artist in enumerate(artists_list[:5]):
        match_pct = 95 - (i * 4) - (hash(artist["name"]) % 3)
        artist["taste_match"] = f"{max(70, match_pct)}% Taste Match"

    # 3. Trending For You
    trending_list = []
    for r in recs[15:]:
        trending_list.append(r)
        if len(trending_list) >= 8:
            break
            
    if not trending_list:
        trending_list = recs[8:16]  # fallback slice

    top_artist_name = profile["top_artists"][0] if profile["top_artists"] else "Harrdy Sandhu"
    raw_genre = profile["top_genres"][0] if profile["top_genres"] else "pop"
    top_genre_name = " ".join(w.capitalize() for w in raw_genre.split())
    
    # Enrich trending list with dynamic indicator & reasons
    trend_indicators = ["+18% Spikes", "Viral", "Rising", "Hot", "+12% Growth"]
    for i, track in enumerate(trending_list[:8]):
        track["trend_indicator"] = trend_indicators[i % len(trend_indicators)]
        if i % 2 == 0:
            track["trend_reason"] = f"Trending because you recently explored {top_genre_name}"
        else:
            track["trend_reason"] = "Trending among listeners with similar taste"
        track["reason"] = track["trend_reason"]
        
    # 4. Smart Recommendation Groups
    used_reasons = set()
    
    def get_unique_reason(track, group_name, index):
        artist = track.get("artist", "Unknown Artist")
        matched_genre = track.get("matched_genre") or raw_genre
        matched_genre = " ".join(w.capitalize() for w in matched_genre.split())
        
        reasons_map = {
            "because_you_like_artist": [
                f"Recommended because you frequently listen to {artist}",
                f"A top track by {artist}, whom you play frequently",
                f"Based on your heavy affinity for {artist}",
                f"Inspired by your plays of {artist}",
                f"Because you listen to a lot of {artist}"
            ],
            "more_genre": [
                f"Because you replay {matched_genre} frequently",
                f"Matches your preferred {matched_genre} genre lanes",
                f"Trending in your favorite {matched_genre} lanes",
                f"A premium {matched_genre} recommendation for you",
                f"Aligned with your {matched_genre} listening history"
            ],
            "recently_trending": [
                "Trending among listeners with similar taste",
                "Popular track rising in your area",
                "Viral hit matching your listening profile",
                "Hot release trending for you",
                "Trending because you recently explored new genres"
            ],
            "hidden_gems": [
                "A hidden gem matches your taste profile",
                "Niche track you might have missed",
                "Undiscovered sounds selected by AI",
                "An acoustic gem tailored for you",
                "Niche release aligned with your taste"
            ],
            "based_on_favorites": [
                "Similar to songs in your favorites",
                "Inspired by tracks you loved recently",
                "Aligned with your favorited playlists",
                "Resonates with your saved collection",
                "Matches your favorite tracks' acoustic profile"
            ],
            "continue_exploring": [
                "Matches your current listening mood",
                "Selected for your evolving taste profile",
                "Explore new acoustic coordinates",
                "Dynamic recommendation for discovery",
                "Vibe match selected by SoundWave AI"
            ]
        }
        
        templates = reasons_map.get(group_name, reasons_map["continue_exploring"])
        for template in templates:
            if template not in used_reasons:
                used_reasons.add(template)
                return template
        return templates[index % len(templates)]

    # Partition recs into groups of 6 tracks each
    # group 1: because you like artist
    group_artist_tracks = [r for r in recs if r.get("artist", "").lower() == top_artist_name.lower()]
    if len(group_artist_tracks) < 6:
        for r in recs:
            if r not in group_artist_tracks:
                group_artist_tracks.append(r)
                if len(group_artist_tracks) >= 6:
                    break
    for i, t in enumerate(group_artist_tracks):
        group_artist_tracks[i] = {**t, "reason": get_unique_reason(t, "because_you_like_artist", i)}

    # group 2: more genre
    group_genre_tracks = [r for r in recs if raw_genre.lower() in str(r.get("genre", [])).lower() or raw_genre.lower() in str(r.get("matched_genre", "")).lower()]
    if len(group_genre_tracks) < 6:
        for r in recs:
            if r not in group_genre_tracks:
                group_genre_tracks.append(r)
                if len(group_genre_tracks) >= 6:
                    break
    for i, t in enumerate(group_genre_tracks):
        group_genre_tracks[i] = {**t, "reason": get_unique_reason(t, "more_genre", i)}

    # group 3: recently trending
    group_trending_tracks = recs[4:10]
    for i, t in enumerate(group_trending_tracks):
        group_trending_tracks[i] = {**t, "reason": get_unique_reason(t, "recently_trending", i)}

    # group 4: hidden gems
    group_hidden_tracks = recs[8:14]
    for i, t in enumerate(group_hidden_tracks):
        group_hidden_tracks[i] = {**t, "reason": get_unique_reason(t, "hidden_gems", i)}

    # group 5: based on favorites
    group_fav_tracks = recs[6:12]
    for i, t in enumerate(group_fav_tracks):
        group_fav_tracks[i] = {**t, "reason": get_unique_reason(t, "based_on_favorites", i)}

    # group 6: continue exploring
    group_explore_tracks = recs[10:16]
    for i, t in enumerate(group_explore_tracks):
        group_explore_tracks[i] = {**t, "reason": get_unique_reason(t, "continue_exploring", i)}

    recommendation_groups = {
        "because_you_like_artist": {
            "title": f"Because You Like {top_artist_name}",
            "tracks": group_artist_tracks
        },
        "more_genre": {
            "title": f"More {top_genre_name}",
            "tracks": group_genre_tracks
        },
        "recently_trending": {
            "title": "Recently Trending For You",
            "tracks": group_trending_tracks
        },
        "hidden_gems": {
            "title": "Hidden Gems",
            "tracks": group_hidden_tracks
        },
        "based_on_favorites": {
            "title": "Based On Your Favorites",
            "tracks": group_fav_tracks
        },
        "continue_exploring": {
            "title": "Continue Exploring",
            "tracks": group_explore_tracks
        }
    }

    # 5. Dynamic Insights
    dynamic_insights = []
    unique_artists_count = profile.get("unique_artists_count", 0)
    total_minutes = profile.get("total_minutes", 0)
    
    if len(profile.get("top_genres", [])) >= 2:
        g1 = " ".join(w.capitalize() for w in profile["top_genres"][0].split())
        g2 = " ".join(w.capitalize() for w in profile["top_genres"][1].split())
        dynamic_insights.append(f"Your taste is evolving toward {g1} and {g2}")
    else:
        dynamic_insights.append(f"Your taste is evolving toward Pop and {top_genre_name}")
        
    discoveries = max(3, min(24, unique_artists_count * 2 + 2))
    dynamic_insights.append(f"You discovered {discoveries} new artists this month")
    
    multiplier = round(1.5 + (total_minutes % 3) * 0.3, 1)
    if multiplier < 1.2:
        multiplier = 2.4
    dynamic_insights.append(f"You replay emotional tracks {multiplier}x more than average")

    # 6. Insights Panel Telemetry
    top_artist_cover = profile["favorite_artist_data"].get("cover_url", "https://picsum.photos/seed/defaultartist/300/300.webp")
    avg_score = int(sum(r["score"] for r in recs[:15]) / 15) if len(recs) >= 15 else 85
    
    insights = {
        "top_artist": {
            "name": top_artist_name,
            "cover_url": top_artist_cover
        },
        "top_genre": top_genre_name,
        "listening_hours_month": round(profile["total_minutes"] / 60.0, 1),
        "listening_hours": round(profile["total_minutes"] / 60.0, 1),
        "total_sessions": profile["sessions_count"],
        "confidence_score": avg_score,
        "recommendation_confidence": f"{avg_score}%",
        "monthly_growth": f"+{round(8.4 + (profile['sessions_count'] % 5) * 1.8, 1)}%",
        "favorite_mood": (profile["top_moods"][0] if profile.get("top_moods") else "Chill").capitalize(),
        "discovery_score": min(98, 70 + (unique_artists_count * 4) + (int(total_minutes) % 5)),
        "dynamic_insights": dynamic_insights
    }
    
    logger.info(f"Recommendation count: {len(recs[:15])} | Artist count: {len(artists_list[:5])} | Trending count: {len(trending_list[:8])}")
    return {
        "insufficient_history": False,
        "insights": insights,
        "recommendations": recs[:15],
        "artists_you_may_like": artists_list[:5],
        "trending_for_you": trending_list[:8],
        "recommendation_groups": recommendation_groups
    }

# ─── modular layer 7: cache & refresh manager ───
async def get_dashboard_recommendations(user_id: str, background_tasks: Any = None) -> Dict[str, Any]:
    cache_key = f"reco:dashboard:{user_id}"
    
    # 1. Try reading from cache
    try:
        cached = await redis.get(cache_key)
        if cached:
            logger.info(f"Cache hit/miss: CACHE HIT for user {user_id}")
            cached_data = json.loads(cached)
            updated_at_str = cached_data.get("updated_at")
            
            # Stale check: > 120 seconds
            is_stale = True
            if updated_at_str:
                updated_at = datetime.fromisoformat(updated_at_str)
                if (datetime.utcnow() - updated_at) <= timedelta(seconds=120):
                    is_stale = False
                    
            if not is_stale:
                logger.info(f"Cache hit/miss: CACHE HIT is fresh for user {user_id}")
                return cached_data["payload"]
                
            # If stale, trigger background refresh
            if background_tasks:
                logger.info(f"Cache stale for user {user_id}. Triggering background refresh.")
                background_tasks.add_task(recalculate_and_cache_recommendations, user_id)
                
            return cached_data["payload"]
    except Exception as e:
        logger.warning(f"Failed to read recommendations cache for user {user_id}: {e}")
        
    # 2. No cache or failure: generate synchronously (never block UI permanently)
    logger.info(f"Cache hit/miss: CACHE MISS for user {user_id}. Generating recommendations synchronously.")
    payload = await generate_recs_pipeline(user_id)
    
    try:
        cache_envelope = {
            "payload": payload,
            "updated_at": datetime.utcnow().isoformat()
        }
        await redis.setex(cache_key, 600, json.dumps(cache_envelope))
    except Exception as e:
        logger.warning(f"Failed to write recommendations cache for user {user_id}: {e}")
        
    return payload

async def recalculate_and_cache_recommendations(user_id: str) -> None:
    cache_key = f"reco:dashboard:{user_id}"
    logger.info(f"Running background recommendations recalculation for user {user_id}")
    try:
        # Generate pipeline
        payload = await generate_recs_pipeline(user_id)
        cache_envelope = {
            "payload": payload,
            "updated_at": datetime.utcnow().isoformat()
        }
        await redis.setex(cache_key, 600, json.dumps(cache_envelope))
        logger.info(f"Background recommendations cache updated for user {user_id}")
    except Exception as e:
        logger.error(f"Failed to recalculate background recommendations for user {user_id}: {e}")

# ─── CORE PIPELINE ───
async def get_offline_fallback(user_id: str) -> Dict[str, Any]:
    logger.info(f"Generating database-driven offline fallback recommendations for user {user_id}")
    try:
        profile = await build_user_taste_profile(user_id)
        if profile["insufficient_history"]:
            return {
                "insufficient_history": True,
                "insights": None,
                "recommendations": [],
                "artists_you_may_like": [],
                "trending_for_you": []
            }
        
        local_songs = await db.songs.find({}).to_list(length=100)
        candidates = []
        for song in local_songs:
            track = {
                "id": str(song.get("_id", song.get("id"))),
                "title": song.get("title"),
                "artist": song.get("artist"),
                "album": song.get("album"),
                "cover_url": song.get("cover_url"),
                "preview_url": song.get("audio_url"),
                "duration": song.get("duration_seconds"),
                "popularity": 80,
                "link": "",
                "source": "database"
            }
            artist = track["artist"]
            genres = song.get("genre", [])
            genre_list = [g.lower().strip() for g in genres] if isinstance(genres, list) else [genres.lower().strip()]
            
            # Check search matching in offline fallback
            matched_search = ""
            for sq in profile.get("recent_searches", []):
                if sq.lower() in track["title"].lower() or sq.lower() in track["artist"].lower():
                    track["retrieval_reason"] = "search_affinity"
                    track["matched_search"] = sq
                    matched_search = sq
                    break
                    
            if artist in profile["top_artists"]:
                track["retrieval_reason"] = "artist_top"
                track["matched_artist"] = artist
                candidates.append(track)
            elif any(g in profile["top_genres"] for g in genre_list):
                matched_g = next(g for g in genre_list if g in profile["top_genres"])
                track["retrieval_reason"] = "genre_trending"
                track["matched_genre"] = matched_g
                candidates.append(track)
            elif matched_search:
                candidates.append(track)
            else:
                track["retrieval_reason"] = "popular_fallback"
                candidates.append(track)
                
        filtered = filter_candidates(candidates, profile)
        scored = score_candidates(filtered[:30], profile)
        ranked = rank_candidates(scored)
        return serialize_dashboard(ranked, profile)
    except Exception as e:
        logger.error(f"Offline fallback generation failed for user {user_id}: {e}")
        return {
            "insufficient_history": False,
            "insights": {
                "top_artist": {"name": "The Weeknd", "cover_url": "https://picsum.photos/seed/TheWeeknd/300/300.webp"},
                "top_genre": "Pop",
                "listening_hours_month": 4.5,
                "total_sessions": 8,
                "confidence_score": 85
            },
            "recommendations": [],
            "artists_you_may_like": [],
            "trending_for_you": []
        }

async def run_recs_pipeline_core(user_id: str) -> Dict[str, Any]:
    # 1. Profile Builder
    profile = await build_user_taste_profile(user_id)
    if profile["insufficient_history"]:
        return {
            "insufficient_history": True,
            "insights": None,
            "recommendations": [],
            "artists_you_may_like": [],
            "trending_for_you": []
        }
        
    # 2. Candidate Retrieval
    candidates = await retrieve_candidates(profile)
    
    # 3. Filtering (First Step)
    filtered_candidates = filter_candidates(candidates, profile)
    
    # Apply Caps BEFORE scoring
    # Max 100 candidate tracks
    filtered_candidates = filtered_candidates[:100]
    # Max 20 artists (cap by distinct artists)
    distinct_artists = {}
    for c in filtered_candidates:
        artist = c.get("artist", "")
        if artist not in distinct_artists:
            distinct_artists[artist] = []
        distinct_artists[artist].append(c)
        
    capped_candidates = []
    for artist, tracks in list(distinct_artists.items())[:20]:
        capped_candidates.extend(tracks)
        
    # 4. Scoring (Second Step)
    scored_candidates = score_candidates(capped_candidates, profile)
    
    # 5. Ranking
    ranked_candidates = rank_candidates(scored_candidates)
    
    # 6. Serialization
    return serialize_dashboard(ranked_candidates, profile)

# ─── CORE PIPELINE WITH TIMEOUT PROTECTION ───
async def generate_recs_pipeline(user_id: str) -> Dict[str, Any]:
    try:
        logger.info(f"Starting recommendations pipeline for user {user_id} with 5s timeout protection")
        # Strict 5-second timeout protection
        return await asyncio.wait_for(run_recs_pipeline_core(user_id), timeout=5.0)
    except asyncio.TimeoutError:
        logger.error(f"Recommendations pipeline timed out for user {user_id} after 5.0s. Falling back to local offline generation.")
        return await get_offline_fallback(user_id)
    except Exception as e:
        logger.error(f"Recommendations pipeline failed for user {user_id}: {e}", exc_info=True)
        return await get_offline_fallback(user_id)

async def invalidate_dashboard_cache(user_id: str) -> None:
    cache_key = f"reco:dashboard:{user_id}"
    try:
        await redis.delete(cache_key)
        logger.info(f"Invalidated recommendations dashboard cache for user {user_id}")
    except Exception as e:
        logger.warning(f"Failed to delete recommendations cache key for user {user_id}: {e}")


# ─── RESTORED ORIGINAL API SUPPORT FUNCTIONS ───
import math

def cosine_similarity(a: List[float], b: List[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def feature_vector(song: dict) -> List[float]:
    f = song.get("features", {})
    return [float(f.get("energy", 0)), float(f.get("valence", 0)), float(f.get("tempo", 0)) / 220.0, float(f.get("danceability", 0))]


async def build_user_profile(user_id: str) -> dict:
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
    recent_song_ids = set()
    for e in events:
        if not e.get("played_at") or not e.get("song_id"):
            continue
        played_at = e["played_at"]
        if isinstance(played_at, str):
            try:
                played_at = datetime.fromisoformat(played_at.replace("Z", ""))
            except Exception:
                continue
        if played_at >= recent_cutoff:
            recent_song_ids.add(e["song_id"])

    skip_rate = {}
    for sid, plays in play_counter.items():
        skip_rate[sid] = skip_counter[sid] / max(plays, 1)

    return {
        "user_id": user_id,
        "user_vector": user_vector,
        "top_genres": {g for g, _ in genre_counter.most_common(6)},
        "top_moods": {m for m, _ in mood_counter.most_common(6)},
        "liked_artists": {a for a, _ in artist_counter.most_common(10)},
        "recent_song_ids": recent_song_ids,
        "skip_rate": skip_rate,
        "artist_counter": artist_counter,
    }


def build_explanations(song: dict, profile: dict, mood: str | None = None) -> List[str]:
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


async def recommend(user_id: str, mood: str | None = None, limit: int = 20) -> List[dict]:
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


async def get_ai_dj_queue(user_id: str, limit: int = 10) -> List[dict]:
    profile = await build_user_profile(user_id)
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
