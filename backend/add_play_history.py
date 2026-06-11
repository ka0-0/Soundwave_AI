import sqlite3
import json
from datetime import datetime, timedelta
from pathlib import Path
from bson import ObjectId

# Paths
db_path = Path(__file__).resolve().parent / "soundwave.db"

# Connect
conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

# Get the demo user
cursor.execute("SELECT id FROM users WHERE email = 'listener@soundwave.ai'")
row = cursor.fetchone()
if not row:
    print("Demo user not found!")
    conn.close()
    exit()
user_id = row[0]

# Get all imported local songs
cursor.execute("SELECT id, title, artist, album, audio_url, cover_url, duration_seconds FROM songs WHERE id LIKE 'local-%'")
local_songs = cursor.fetchall()

print(f"Adding play history for {len(local_songs)} local songs...")

for i, song in enumerate(local_songs):
    song_id, title, artist, album, audio_url, cover_url, duration = song
    
    # Structure of track_data
    track_data = {
        "id": song_id,
        "title": title,
        "artist": artist,
        "album": album,
        "audio_url": audio_url,
        "cover_url": cover_url,
        "src": audio_url,
        "duration": duration,
        "source": "audio"
    }
    
    played_at = datetime.utcnow() - timedelta(minutes=(i * 15 + 5))
    
    # 1. Insert into recently_played
    cursor.execute("""
        INSERT OR REPLACE INTO recently_played (id, user_id, song_id, track_data, played_at)
        VALUES (?, ?, ?, ?, ?)
    """, (
        str(ObjectId()),
        user_id,
        song_id,
        json.dumps(track_data),
        played_at.isoformat()
    ))
    
    # 2. Insert into play_events
    cursor.execute("""
        INSERT INTO play_events (id, user_id, song_id, played_at, duration_played, skipped, skip_at_second, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        str(ObjectId()),
        user_id,
        song_id,
        played_at.isoformat(),
        duration,
        0, # Not skipped
        None,
        "recommendation"
    ))

conn.commit()
conn.close()
print("Successfully populated play history in the database!")
