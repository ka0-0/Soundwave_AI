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
ARTISTS = [
    "Nova Bloom", "Echo Harbor", "Luna Drive", "Night Static", "Velvet Signal", "Neon Atlas", "Solar Haze",
    "Blue Meridian", "Crimson Tide", "Aurora Lane", "Skyline Ritual", "Pulse District",
]


def random_features():
    return {
        "energy": round(random.uniform(0.2, 0.95), 3),
        "valence": round(random.uniform(0.1, 0.95), 3),
        "tempo": round(random.uniform(70, 180), 2),
        "danceability": round(random.uniform(0.2, 0.98), 3),
    }


def generate_song(i: int):
    artist = random.choice(ARTISTS)
    genre = random.sample(GENRES, k=random.randint(1, 2))
    moods = random.sample(MOODS, k=random.randint(1, 3))
    year = random.randint(2016, 2026)
    return {
        "title": f"Signal #{i:02d}",
        "artist": artist,
        "album": f"{artist} Vol.{random.randint(1, 6)}",
        "genre": genre,
        "mood_tags": moods,
        "duration_seconds": random.randint(150, 295),
        "audio_url": f"https://cdn.soundwave.ai/audio/track-{i:02d}.mp3",
        "cover_url": f"https://picsum.photos/seed/soundwave-{i:02d}/600/600.webp",
        "release_year": year,
        "features": random_features(),
    }


async def main():
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[MONGO_DB]
    await db.songs.delete_many({})
    songs = [generate_song(i) for i in range(1, 51)]
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
                        "duration_played": random.randint(20, 280),
                        "skipped": skipped,
                        "skip_at_second": random.randint(10, 70) if skipped else None,
                        "source": random.choice(["recommendation", "playlist", "search"]),
                    }
                )
            await db.play_events.insert_many(events)
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
