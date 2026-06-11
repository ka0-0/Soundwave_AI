import os

import lyricsgenius
from dotenv import load_dotenv

load_dotenv()


def get_genius_client() -> lyricsgenius.Genius:
    token = os.getenv("GENIUS_API_KEY")
    if not token:
        raise ValueError("GENIUS_API_KEY is not set in the environment.")
    return lyricsgenius.Genius(token, verbose=False, remove_section_headers=True)


def fetch_lyrics(song_title: str, artist_name: str) -> str | None:
    """Fetch full lyrics for a song using the Genius API."""
    if not song_title or not artist_name:
        return None

    genius = get_genius_client()
    song = genius.search_song(song_title, artist_name)
    if song and song.lyrics:
        return song.lyrics.strip()
    return None
