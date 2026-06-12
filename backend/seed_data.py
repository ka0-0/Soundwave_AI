import asyncio
import random
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "soundwave_ai")

GENRES = ["pop", "indie", "electronic", "rnb", "hip-hop", "ambient", "rock", "house", "lofi", "jazz"]
MOODS = ["study", "gym", "chill", "sleep", "travel", "party", "sad", "happy"]

REAL_SONGS = [
    {"title": "Blinding Lights", "artist": "The Weeknd", "album": "After Hours", "genre": ["pop"], "mood_tags": ["party", "happy"], "duration_seconds": 200, "cover_url": "https://picsum.photos/seed/blindinglights/600/600.webp", "release_year": 2020},
    {"title": "Save Your Tears", "artist": "The Weeknd", "album": "After Hours", "genre": ["pop", "rnb"], "mood_tags": ["happy", "chill"], "duration_seconds": 215, "cover_url": "https://picsum.photos/seed/saveyoutears/600/600.webp", "release_year": 2020},
    {"title": "Starboy", "artist": "The Weeknd", "album": "Starboy", "genre": ["rnb", "pop"], "mood_tags": ["hype", "party"], "duration_seconds": 230, "cover_url": "https://picsum.photos/seed/starboy/600/600.webp", "release_year": 2016},
    {"title": "Believer", "artist": "Imagine Dragons", "album": "Evolve", "genre": ["rock", "pop"], "mood_tags": ["gym", "workout", "hype"], "duration_seconds": 204, "cover_url": "https://picsum.photos/seed/believer/600/600.webp", "release_year": 2017},
    {"title": "Thunder", "artist": "Imagine Dragons", "album": "Evolve", "genre": ["pop", "rock"], "mood_tags": ["workout", "happy"], "duration_seconds": 187, "cover_url": "https://picsum.photos/seed/thunder/600/600.webp", "release_year": 2017},
    {"title": "Counting Stars", "artist": "OneRepublic", "album": "Native", "genre": ["pop"], "mood_tags": ["happy", "travel"], "duration_seconds": 257, "cover_url": "https://picsum.photos/seed/countingstars/600/600.webp", "release_year": 2013},
    {"title": "Apologize", "artist": "OneRepublic", "album": "Dreaming Out Loud", "genre": ["pop", "rnb"], "mood_tags": ["sad", "chill"], "duration_seconds": 208, "cover_url": "https://picsum.photos/seed/apologize/600/600.webp", "release_year": 2007},
    {"title": "Yellow", "artist": "Coldplay", "album": "Parachutes", "genre": ["rock", "indie"], "mood_tags": ["chill", "sad"], "duration_seconds": 269, "cover_url": "https://picsum.photos/seed/yellow/600/600.webp", "release_year": 2000},
    {"title": "Viva La Vida", "artist": "Coldplay", "album": "Viva la Vida", "genre": ["rock", "pop"], "mood_tags": ["happy", "travel"], "duration_seconds": 242, "cover_url": "https://picsum.photos/seed/vivalavida/600/600.webp", "release_year": 2008},
    {"title": "Bad Guy", "artist": "Billie Eilish", "album": "When We All Fall Asleep", "genre": ["pop", "electronic"], "mood_tags": ["hype", "party"], "duration_seconds": 194, "cover_url": "https://picsum.photos/seed/badguy/600/600.webp", "release_year": 2019},
    {"title": "Ocean Eyes", "artist": "Billie Eilish", "album": "Don't Smile at Me", "genre": ["pop", "ambient"], "mood_tags": ["sleep", "chill"], "duration_seconds": 200, "cover_url": "https://picsum.photos/seed/oceaneyes/600/600.webp", "release_year": 2016},
    {"title": "Get Lucky", "artist": "Daft Punk", "album": "Random Access Memories", "genre": ["electronic", "house"], "mood_tags": ["party", "happy"], "duration_seconds": 249, "cover_url": "https://picsum.photos/seed/getlucky/600/600.webp", "release_year": 2013},
    {"title": "One More Time", "artist": "Daft Punk", "album": "Discovery", "genre": ["electronic", "house"], "mood_tags": ["party", "hype"], "duration_seconds": 320, "cover_url": "https://picsum.photos/seed/onemoretime/600/600.webp", "release_year": 2000},
    {"title": "Shape of You", "artist": "Ed Sheeran", "album": "Divide", "genre": ["pop"], "mood_tags": ["happy", "workout"], "duration_seconds": 233, "cover_url": "https://picsum.photos/seed/shapeofyou/600/600.webp", "release_year": 2017},
    {"title": "Perfect", "artist": "Ed Sheeran", "album": "Divide", "genre": ["pop"], "mood_tags": ["chill", "happy"], "duration_seconds": 263, "cover_url": "https://picsum.photos/seed/perfect/600/600.webp", "release_year": 2017},
    {"title": "Levitating", "artist": "Dua Lipa", "album": "Future Nostalgia", "genre": ["pop"], "mood_tags": ["party", "happy"], "duration_seconds": 203, "cover_url": "https://picsum.photos/seed/levitating/600/600.webp", "release_year": 2020},
    {"title": "Don't Start Now", "artist": "Dua Lipa", "album": "Future Nostalgia", "genre": ["pop", "electronic"], "mood_tags": ["party", "workout"], "duration_seconds": 183, "cover_url": "https://picsum.photos/seed/dontstartnow/600/600.webp", "release_year": 2019},
    {"title": "Uptown Funk", "artist": "Bruno Mars", "album": "Uptown Special", "genre": ["pop", "rnb"], "mood_tags": ["party", "happy", "hype"], "duration_seconds": 270, "cover_url": "https://picsum.photos/seed/uptownfunk/600/600.webp", "release_year": 2014},
    {"title": "Just the Way You Are", "artist": "Bruno Mars", "album": "Doo-Wops & Hooligans", "genre": ["pop"], "mood_tags": ["happy", "chill"], "duration_seconds": 220, "cover_url": "https://picsum.photos/seed/justthewayyouare/600/600.webp", "release_year": 2010},
    {"title": "Fix You", "artist": "Coldplay", "album": "X&Y", "genre": ["rock", "indie"], "mood_tags": ["sad", "chill"], "duration_seconds": 295, "cover_url": "https://picsum.photos/seed/fixyou/600/600.webp", "release_year": 2005}
]

def random_features():
    return {
        "energy": round(random.uniform(0.4, 0.95), 3),
        "valence": round(random.uniform(0.3, 0.95), 3),
        "tempo": round(random.uniform(80, 140), 2),
        "danceability": round(random.uniform(0.5, 0.95), 3),
    }

async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[MONGO_DB]
    await db.songs.delete_many({})
    
    songs = []
    for i, s_data in enumerate(REAL_SONGS):
        songs.append({
            "title": s_data["title"],
            "artist": s_data["artist"],
            "album": s_data["album"],
            "genre": s_data["genre"],
            "mood_tags": s_data["mood_tags"],
            "duration_seconds": s_data["duration_seconds"],
            "audio_url": f"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-{ (i % 16) + 1 }.mp3",
            "cover_url": s_data["cover_url"],
            "release_year": s_data["release_year"],
            "features": random_features(),
        })
        
    result = await db.songs.insert_many(songs)
    print(f"Seeded {len(result.inserted_ids)} songs")

    users = await db.users.find({}).to_list(length=10)
    if users:
        song_ids = [str(x) for x in result.inserted_ids]
        for user in users:
            events = []
            for _ in range(120):
                sid = random.choice(song_ids)
                played_at = datetime.utcnow() - timedelta(days=random.randint(0, 120), hours=random.randint(0, 23))
                skipped = random.random() < 0.18
                events.append(
                    {
                        "user_id": str(user["_id"]),
                        "song_id": sid,
                        "played_at": played_at,
                        "duration_played": random.randint(30, 280) if not skipped else random.randint(5, 29),
                        "skipped": skipped,
                        "skip_at_second": random.randint(10, 29) if skipped else None,
                        "source": random.choice(["recommendation", "playlist", "search"]),
                    }
                )
            await db.play_events.insert_many(events)
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
