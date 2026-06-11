import os
import shutil
import sqlite3
import json
from pathlib import Path

# Setup paths
workspace_dir = Path(__file__).resolve().parents[1]
player_dir = workspace_dir / "frontend" / "src" / "components" / "player"
public_songs_dir = workspace_dir / "frontend" / "public" / "songs"
db_path = workspace_dir / "backend" / "soundwave.db"

# Create output folder if it doesn't exist
public_songs_dir.mkdir(parents=True, exist_ok=True)

# Connect to database
conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

# Get all files from player folder
audio_extensions = (".mp3", ".mp4", ".m4a", ".wav")
files = [f for f in os.listdir(str(player_dir)) if f.lower().endswith(audio_extensions)]

print(f"Found {len(files)} audio files in player folder.")

for file_name in files:
    src_file = player_dir / file_name
    dest_file = public_songs_dir / file_name
    
    # Copy file to public/songs/ so Vite serves it statically
    shutil.copy2(str(src_file), str(dest_file))
    print(f"Copied '{file_name}' to public/songs/")
    
    # Parse title & artist
    name_without_ext = os.path.splitext(file_name)[0]
    
    artist = "Local Artist"
    title = name_without_ext
    
    if " - " in name_without_ext:
        parts = name_without_ext.split(" - ")
        title = parts[0].strip()
        artist = parts[1].split("(")[0].strip()  # Remove "(128 kbps)" etc
    elif " " in name_without_ext:
        parts = name_without_ext.split(" ")
        title = parts[0].strip()
        artist = " ".join(parts[1:]).split("(")[0].strip()
    
    # Clean underscores and clean name tags
    title = title.replace("_", " ")
    artist = artist.replace("_", " ")
    
    # Unique ID based on filename
    song_id = f"local-{name_without_ext.lower().replace(' ', '-')}"
    
    # Features for AI DJ recommendations (mix of high energy, chill, happy)
    # We tag high-energy tracks for Energy (gym, workout, hype, party)
    mood_tags = ["chill", "happy"]
    energy = 0.5
    valence = 0.6
    tempo = 105.0
    
    low_title = title.lower()
    if any(k in low_title for k in ["energy", "tuition", "fortuner", "queen", "desirock", "badmashi"]):
        mood_tags = ["gym", "workout", "hype", "party", "happy"]
        energy = 0.85
        valence = 0.75
        tempo = 128.0
    elif any(k in low_title for k in ["bairan", "dhurandhar", "samjhe", "cozy"]):
        mood_tags = ["chill", "sad", "study", "sleep"]
        energy = 0.4
        valence = 0.35
        tempo = 90.0
        
    audio_url = f"/songs/{file_name}"
    cover_url = f"https://picsum.photos/seed/{song_id}/600/600.webp"
    
    song_record = (
        song_id,
        title,
        artist,
        "Local Collection",
        json.dumps(["Local"]),
        json.dumps(mood_tags),
        200, # default duration
        audio_url,
        cover_url,
        2026,
        json.dumps({
            "energy": energy,
            "valence": valence,
            "tempo": tempo,
            "danceability": round(energy * 0.9, 2)
        })
    )
    
    cursor.execute("""
        INSERT OR REPLACE INTO songs (id, title, artist, album, genre, mood_tags, duration_seconds, audio_url, cover_url, release_year, features)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, song_record)

conn.commit()
conn.close()
print("All songs successfully copied and registered in the database!")
