import spotipy
from spotipy.oauth2 import SpotifyClientCredentials
import os

SPOTIFY_CLIENT_ID = "your_client_id_here"
SPOTIFY_CLIENT_SECRET = "your_client_secret_here"

sp = spotipy.Spotify(auth_manager=SpotifyClientCredentials(
    client_id=SPOTIFY_CLIENT_ID,
    client_secret=SPOTIFY_CLIENT_SECRET
))

def search_song(song_name, limit=5):
    results = sp.search(q=song_name, limit=limit, type='track')
    tracks = results['tracks']['items']
    songs = []
    for track in tracks:
        songs.append({
            'name': track['name'],
            'artist': track['artists'][0]['name'],
            'album': track['album']['name'],
            'album_art': track['album']['images'][0]['url'] if track['album']['images'] else '',
            'preview_url': track['preview_url'],
            'spotify_url': track['external_urls']['spotify'],
            'id': track['id']
        })
    return songs

def get_vibe_songs(track_id, limit=10):
    features = sp.audio_features([track_id])[0]
    if not features:
        return []
    recommendations = sp.recommendations(
        seed_tracks=[track_id],
        target_energy=features['energy'],
        target_valence=features['valence'],
        target_tempo=features['tempo'],
        target_danceability=features['danceability'],
        target_acousticness=features['acousticness'],
        limit=limit
    )
    vibe_songs = []
    for track in recommendations['tracks']:
        vibe_songs.append({
            'name': track['name'],
            'artist': track['artists'][0]['name'],
            'album': track['album']['name'],
            'album_art': track['album']['images'][0]['url'] if track['album']['images'] else '',
            'preview_url': track['preview_url'],
            'spotify_url': track['external_urls']['spotify'],
            'id': track['id']
        })
    return vibe_songs

def get_lyrics(song_name, artist_name):
    import lyricsgenius
    GENIUS_TOKEN = "your_genius_api_token_here"
    genius = lyricsgenius.Genius(GENIUS_TOKEN, skip_non_songs=True, excluded_terms=["(Remix)", "(Live)"])
    try:
        song = genius.search_song(song_name, artist_name)
        return song.lyrics if song else "Lyrics not found."
    except:
        return "Lyrics not available."
