import asyncio
from app.database import db

async def inspect():
    song = await db.songs.find_one({})
    print("SONG SAMPLE:", song)
    fav = await db.favorites.find_one({})
    print("FAVORITE SAMPLE:", fav)
    play = await db.recently_played.find_one({})
    print("PLAY SAMPLE:", play)

asyncio.run(inspect())
