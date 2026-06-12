import logging
import sqlite3
import json
from datetime import datetime, timedelta
from bson import ObjectId

logger = logging.getLogger("soundwave.sqlite_db")
DEMO_PASSWORD_HASH = "$2b$12$Lf5IUzkI8G4lKBmR5wY8WuzYiL/fHPAascYH75.HvD6sDSke9aGvO"


class SQLiteDB:
    def __init__(self, db_path="soundwave.db"):
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._create_tables()
        self._populate_initial_data()

    def __getitem__(self, name):
        return SQLiteCollection(self, name)


    def _migrate_schema(self, cursor):
        """Add any missing columns to existing tables without dropping data."""
        user_cols = [
            "full_name TEXT", "age INTEGER", "gender TEXT", "country TEXT",
            "bio TEXT", "favorite_genres TEXT", "favorite_artists TEXT",
            "oauth_provider TEXT", "oauth_id TEXT",
        ]
        for col_def in user_cols:
            col_name = col_def.split()[0]
            try:
                cursor.execute(f"ALTER TABLE users ADD COLUMN {col_def}")
                logger.info("DB migration: added users.%s", col_name)
            except Exception:
                pass
        self.conn.commit()

    def _create_tables(self):
        cursor = self.conn.cursor()
        
        # Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                username TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                avatar_url TEXT,
                full_name TEXT,
                age INTEGER,
                gender TEXT,
                country TEXT,
                bio TEXT,
                favorite_genres TEXT,
                favorite_artists TEXT,
                oauth_provider TEXT,
                oauth_id TEXT,
                created_at TEXT NOT NULL,
                preferences TEXT
            )
        """)
        self._migrate_schema(cursor)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ai_avatars (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                image_url TEXT NOT NULL,
                original_image_url TEXT,
                mood TEXT NOT NULL,
                style TEXT NOT NULL,
                name TEXT,
                metadata TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS auth_sessions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                revoked_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        # Songs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS songs (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                artist TEXT NOT NULL,
                album TEXT NOT NULL,
                genre TEXT NOT NULL,
                mood_tags TEXT NOT NULL,
                duration_seconds INTEGER NOT NULL,
                audio_url TEXT NOT NULL,
                cover_url TEXT NOT NULL,
                release_year INTEGER NOT NULL,
                features TEXT NOT NULL
            )
        """)
        
        # Play events table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS play_events (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                song_id TEXT NOT NULL,
                played_at TEXT NOT NULL,
                duration_played INTEGER NOT NULL,
                skipped INTEGER NOT NULL,
                skip_at_second INTEGER,
                source TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)
        
        # Liked songs table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS liked_songs (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                song_id TEXT NOT NULL,
                liked_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, song_id)
            )
        """)
        
        # Playlists table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS playlists (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                cover_url TEXT,
                song_ids TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS analysis_requests (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                track_name TEXT NOT NULL,
                artist_name TEXT,
                status TEXT NOT NULL,
                result TEXT,
                error_message TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                completed_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_analysis_user_status
            ON analysis_requests(user_id, status)
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                revoked_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_preferences (
                id TEXT PRIMARY KEY,
                user_id TEXT UNIQUE NOT NULL,
                language TEXT NOT NULL DEFAULT 'en',
                theme TEXT NOT NULL DEFAULT 'dark',
                high_contrast INTEGER NOT NULL DEFAULT 0,
                font_scale REAL NOT NULL DEFAULT 1.0,
                dashboard_settings TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_searches (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                query TEXT NOT NULL,
                search_type TEXT NOT NULL DEFAULT 'song',
                results_count INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS favorites (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                track_id TEXT NOT NULL,
                track_data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                UNIQUE(user_id, track_id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS password_resets (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                used_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS music_analyses (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                track_id TEXT,
                track_name TEXT NOT NULL,
                artist_name TEXT,
                insights TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS saved_reports (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                track_data TEXT NOT NULL,
                insights TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS saved_songs (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                song_id TEXT NOT NULL,
                saved_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id),
                UNIQUE(user_id, song_id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS recently_played (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                song_id TEXT NOT NULL,
                track_data TEXT NOT NULL,
                played_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS recommendations (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                track_id TEXT NOT NULL,
                track_data TEXT NOT NULL,
                reason TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_recent_played_user
            ON recently_played(user_id, played_at)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_recs_user
            ON recommendations(user_id)
        """)

        cursor.execute(
            "UPDATE users SET password_hash = ? WHERE email = ?",
            (DEMO_PASSWORD_HASH, "listener@soundwave.ai"),
        )

        # ── Schema migrations (safe: ignore if column already exists) ──────────
        migrations = [
            "ALTER TABLE favorites ADD COLUMN track_id TEXT NOT NULL DEFAULT ''",
            "ALTER TABLE favorites ADD COLUMN track_data TEXT NOT NULL DEFAULT '{}'",
            "ALTER TABLE favorites ADD COLUMN created_at TEXT NOT NULL DEFAULT ''",
            "ALTER TABLE recently_played ADD COLUMN track_data TEXT NOT NULL DEFAULT '{}'",
            "ALTER TABLE recently_played ADD COLUMN song_id TEXT NOT NULL DEFAULT ''",
            "ALTER TABLE recently_played ADD COLUMN played_at TEXT NOT NULL DEFAULT ''",
        ]
        for sql in migrations:
            try:
                cursor.execute(sql)
            except Exception:
                pass  # column already exists — skip

        self.conn.commit()

    def _populate_initial_data(self):
        cursor = self.conn.cursor()
        
        # Check if songs already exist
        cursor.execute("SELECT COUNT(*) FROM songs")
        if cursor.fetchone()[0] > 0:
            return
        
        import random
        random.seed(42)
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
        
        for i, s_data in enumerate(REAL_SONGS):
            song_id = str(ObjectId())
            cursor.execute("""
                INSERT INTO songs (id, title, artist, album, genre, mood_tags, duration_seconds, audio_url, cover_url, release_year, features)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                song_id,
                s_data["title"],
                s_data["artist"],
                s_data["album"],
                json.dumps(s_data["genre"]),
                json.dumps(s_data["mood_tags"]),
                s_data["duration_seconds"],
                f"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-{ (i % 16) + 1 }.mp3",
                s_data["cover_url"],
                s_data["release_year"],
                json.dumps({
                    "energy": round(random.uniform(0.4, 0.95), 3),
                    "valence": round(random.uniform(0.3, 0.95), 3),
                    "tempo": round(random.uniform(80, 140), 2),
                    "danceability": round(random.uniform(0.5, 0.95), 3),
                })
            ))
        
        # Add demo user
        demo_user_id = str(ObjectId())
        cursor.execute("""
            INSERT INTO users (id, email, username, password_hash, avatar_url, full_name, age, gender, country, bio, favorite_genres, favorite_artists, created_at, preferences)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            demo_user_id,
            "listener@soundwave.ai",
            "Listener",
            DEMO_PASSWORD_HASH,  # password123
            "",
            "John Doe",
            28,
            "Male",
            "United Kingdom",
            "Digital music enthusiast and audio analyst.",
            json.dumps(["pop", "rock", "electronic"]),
            json.dumps(["The Weeknd", "Imagine Dragons"]),
            datetime.utcnow().isoformat(),
            json.dumps({"themes": [], "moods": [], "genres": []})
        ))
        
        # Get song IDs for play events
        cursor.execute("SELECT id FROM songs")
        song_ids = [row[0] for row in cursor.fetchall()]
        
        # Pre-populate history for demo user
        for _ in range(120):
            sid = random.choice(song_ids)
            played_at = datetime.utcnow() - timedelta(days=random.randint(0, 120), hours=random.randint(0, 23))
            skipped = random.random() < 0.18
            cursor.execute("""
                INSERT INTO play_events (id, user_id, song_id, played_at, duration_played, skipped, skip_at_second, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(ObjectId()),
                demo_user_id,
                sid,
                played_at.isoformat(),
                random.randint(30, 280) if not skipped else random.randint(5, 29),
                1 if skipped else 0,
                random.randint(10, 29) if skipped else None,
                random.choice(["recommendation", "playlist", "search"])
            ))
        
        self.conn.commit()
        logger.info("SQLite database initialized with initial data")


class SQLiteCollection:
    def __init__(self, db, table_name):
        self.db = db
        self.table_name = table_name

    async def count_documents(self, query):
        cursor = self.db.conn.cursor()
        where_clause, params = self._build_where_clause(query)
        cursor.execute(f"SELECT COUNT(*) FROM {self.table_name} {where_clause}", params)
        return cursor.fetchone()[0]

    def find(self, query=None):
        query = query or {}
        return SQLiteCursor(self.db, self.table_name, query)

    async def find_one(self, query):
        cursor = self.db.conn.cursor()
        where_clause, params = self._build_where_clause(query)
        cursor.execute(f"SELECT * FROM {self.table_name} {where_clause} LIMIT 1", params)
        row = cursor.fetchone()
        if row:
            return self._row_to_dict(row)
        return None

    async def insert_one(self, doc):
        doc_id = doc.get("_id", str(ObjectId()))
        cursor = self.db.conn.cursor()
        
        if self.table_name == "users":
            cursor.execute("""
                INSERT INTO users (id, email, username, password_hash, avatar_url, full_name, age, gender, country, bio, favorite_genres, favorite_artists, created_at, preferences)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                doc["email"],
                doc["username"],
                doc["password_hash"],
                doc.get("avatar_url", ""),
                doc.get("full_name", ""),
                doc.get("age"),
                doc.get("gender", ""),
                doc.get("country", ""),
                doc.get("bio", ""),
                json.dumps(doc.get("favorite_genres", [])),
                json.dumps(doc.get("favorite_artists", [])),
                doc.get("created_at", datetime.utcnow().isoformat()),
                json.dumps(doc.get("preferences", {"themes": [], "moods": [], "genres": []}))
            ))
        elif self.table_name == "ai_avatars":
            cursor.execute("""
                INSERT INTO ai_avatars (id, user_id, image_url, original_image_url, mood, style, name, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                str(doc["user_id"]),
                doc["image_url"],
                doc.get("original_image_url"),
                doc["mood"],
                doc["style"],
                doc.get("name"),
                json.dumps(doc.get("metadata", {})),
                doc.get("created_at", datetime.utcnow().isoformat())
            ))
        elif self.table_name == "songs":
            cursor.execute("""
                INSERT INTO songs (id, title, artist, album, genre, mood_tags, duration_seconds, audio_url, cover_url, release_year, features)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                doc["title"],
                doc["artist"],
                doc["album"],
                json.dumps(doc["genre"]),
                json.dumps(doc["mood_tags"]),
                doc["duration_seconds"],
                doc["audio_url"],
                doc["cover_url"],
                doc["release_year"],
                json.dumps(doc["features"])
            ))
        elif self.table_name == "auth_sessions":
            cursor.execute("""
                INSERT INTO auth_sessions (id, user_id, token, created_at, expires_at, revoked_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                str(doc["user_id"]),
                doc["token"],
                doc["created_at"].isoformat() if isinstance(doc["created_at"], datetime) else doc["created_at"],
                doc["expires_at"].isoformat() if isinstance(doc["expires_at"], datetime) else doc["expires_at"],
                doc.get("revoked_at").isoformat() if isinstance(doc.get("revoked_at"), datetime) else doc.get("revoked_at"),
            ))
        elif self.table_name == "play_events":
            cursor.execute("""
                INSERT INTO play_events (id, user_id, song_id, played_at, duration_played, skipped, skip_at_second, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                doc["user_id"],
                doc["song_id"],
                doc["played_at"].isoformat() if isinstance(doc["played_at"], datetime) else doc["played_at"],
                doc["duration_played"],
                1 if doc.get("skipped", False) else 0,
                doc.get("skip_at_second"),
                doc["source"]
            ))
        elif self.table_name == "liked_songs":
            cursor.execute("""
                INSERT OR IGNORE INTO liked_songs (id, user_id, song_id, liked_at)
                VALUES (?, ?, ?, ?)
            """, (
                doc_id,
                doc["user_id"],
                doc["song_id"],
                doc["liked_at"].isoformat() if isinstance(doc["liked_at"], datetime) else doc["liked_at"]
            ))
        elif self.table_name == "playlists":
            cursor.execute("""
                INSERT INTO playlists (id, user_id, name, description, cover_url, song_ids, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                doc["user_id"],
                doc["name"],
                doc.get("description"),
                doc.get("cover_url"),
                json.dumps(doc.get("song_ids", [])),
                doc["created_at"].isoformat() if isinstance(doc["created_at"], datetime) else doc["created_at"],
                doc["updated_at"].isoformat() if isinstance(doc["updated_at"], datetime) else doc["updated_at"]
            ))
        elif self.table_name == "analysis_requests":
            cursor.execute("""
                INSERT INTO analysis_requests (
                    id, user_id, track_name, artist_name, status, result, error_message,
                    created_at, updated_at, completed_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                str(doc["user_id"]),
                doc["track_name"],
                doc.get("artist_name", ""),
                doc.get("status", "pending"),
                json.dumps(doc.get("result")) if doc.get("result") is not None else None,
                doc.get("error_message"),
                doc["created_at"].isoformat() if isinstance(doc["created_at"], datetime) else doc["created_at"],
                doc["updated_at"].isoformat() if isinstance(doc["updated_at"], datetime) else doc["updated_at"],
                doc.get("completed_at").isoformat() if isinstance(doc.get("completed_at"), datetime) else doc.get("completed_at")
            ))
        elif self.table_name == "refresh_tokens":
            cursor.execute("""
                INSERT INTO refresh_tokens (id, user_id, token, created_at, expires_at, revoked_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                str(doc["user_id"]),
                doc["token"],
                doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at", datetime.utcnow().isoformat()),
                doc["expires_at"].isoformat() if isinstance(doc.get("expires_at"), datetime) else doc["expires_at"],
                doc.get("revoked_at").isoformat() if isinstance(doc.get("revoked_at"), datetime) else doc.get("revoked_at"),
            ))
        elif self.table_name == "user_preferences":
            cursor.execute("""
                INSERT INTO user_preferences (
                    id, user_id, language, theme, high_contrast, font_scale,
                    dashboard_settings, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                str(doc["user_id"]),
                doc.get("language", "en"),
                doc.get("theme", "dark"),
                1 if doc.get("high_contrast") else 0,
                float(doc.get("font_scale", 1.0)),
                json.dumps(doc.get("dashboard_settings", {})),
                doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at", datetime.utcnow().isoformat()),
                doc["updated_at"].isoformat() if isinstance(doc.get("updated_at"), datetime) else doc.get("updated_at", datetime.utcnow().isoformat()),
            ))
        elif self.table_name == "user_searches":
            cursor.execute("""
                INSERT INTO user_searches (id, user_id, query, search_type, results_count, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                doc_id, str(doc["user_id"]), doc["query"], doc.get("search_type", "song"),
                int(doc.get("results_count", 0)),
                doc["created_at"].isoformat() if isinstance(doc["created_at"], datetime) else doc["created_at"],
            ))
        elif self.table_name == "favorites":
            cursor.execute("""
                INSERT OR IGNORE INTO favorites (id, user_id, track_id, track_data, created_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                doc_id, str(doc["user_id"]), doc["track_id"],
                json.dumps(doc.get("track_data", {})),
                doc["created_at"].isoformat() if isinstance(doc["created_at"], datetime) else doc["created_at"],
            ))
        elif self.table_name == "music_analyses":
            cursor.execute("""
                INSERT INTO music_analyses (id, user_id, track_id, track_name, artist_name, insights, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                doc_id, str(doc["user_id"]), doc.get("track_id"), doc["track_name"],
                doc.get("artist_name", ""), json.dumps(doc.get("insights", {})),
                doc["created_at"].isoformat() if isinstance(doc["created_at"], datetime) else doc["created_at"],
                doc["updated_at"].isoformat() if isinstance(doc["updated_at"], datetime) else doc["updated_at"],
            ))
        elif self.table_name == "saved_reports":
            cursor.execute("""
                INSERT INTO saved_reports (id, user_id, title, track_data, insights, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                doc_id, str(doc["user_id"]), doc["title"],
                json.dumps(doc.get("track_data", {})), json.dumps(doc.get("insights", {})),
                doc["created_at"].isoformat() if isinstance(doc["created_at"], datetime) else doc["created_at"],
            ))
        elif self.table_name == "recently_played":
            cursor.execute("""
                INSERT INTO recently_played (id, user_id, song_id, track_data, played_at)
                VALUES (?, ?, ?, ?, ?)
            """, (
                doc_id,
                str(doc["user_id"]),
                str(doc["song_id"]),
                json.dumps(doc.get("track_data", {})),
                doc["played_at"].isoformat() if isinstance(doc["played_at"], datetime) else doc.get("played_at", datetime.utcnow().isoformat())
            ))
        elif self.table_name == "recommendations":
            cursor.execute("""
                INSERT INTO recommendations (id, user_id, track_id, track_data, reason, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                doc_id,
                str(doc["user_id"]),
                str(doc["track_id"]),
                json.dumps(doc.get("track_data", {})),
                doc.get("reason", ""),
                doc["created_at"].isoformat() if isinstance(doc["created_at"], datetime) else doc.get("created_at", datetime.utcnow().isoformat())
            ))
        elif self.table_name == "saved_songs":
            cursor.execute("""
                INSERT OR IGNORE INTO saved_songs (id, user_id, song_id, saved_at)
                VALUES (?, ?, ?, ?)
            """, (
                doc_id,
                str(doc["user_id"]),
                str(doc["song_id"]),
                doc["saved_at"].isoformat() if isinstance(doc["saved_at"], datetime) else doc.get("saved_at", datetime.utcnow().isoformat())
            ))
        
        self.db.conn.commit()
        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        return InsertResult(doc_id)

    async def insert_many(self, docs):
        inserted_ids = []
        for doc in docs:
            result = await self.insert_one(doc)
            inserted_ids.append(result.inserted_id)
        class InsertManyResult:
            def __init__(self, ids):
                self.inserted_ids = ids
        return InsertManyResult(inserted_ids)

    async def delete_one(self, query):
        cursor = self.db.conn.cursor()
        where_clause, params = self._build_where_clause(query)
        cursor.execute(f"DELETE FROM {self.table_name} {where_clause} LIMIT 1", params)
        self.db.conn.commit()
        class DeleteResult:
            def __init__(self, deleted_count):
                self.deleted_count = deleted_count
        return DeleteResult(cursor.rowcount)

    async def delete_many(self, query):
        cursor = self.db.conn.cursor()
        where_clause, params = self._build_where_clause(query)
        cursor.execute(f"DELETE FROM {self.table_name} {where_clause}", params)
        deleted_count = cursor.rowcount
        self.db.conn.commit()
        class DeleteResultMany:
            def __init__(self, deleted_count):
                self.deleted_count = deleted_count
        return DeleteResultMany(deleted_count)

    async def update_one(self, query, update):
        cursor = self.db.conn.cursor()
        where_clause, where_params = self._build_where_clause(query)
        
        set_clauses = []
        set_params = []
        
        if "$set" in update:
            for k, v in update["$set"].items():
                if k == "updated_at":
                    set_clauses.append("updated_at = ?")
                    set_params.append(v.isoformat() if isinstance(v, datetime) else v)
                elif k == "song_ids":
                    set_clauses.append("song_ids = ?")
                    set_params.append(json.dumps(v))
                elif k == "preferences":
                    set_clauses.append("preferences = ?")
                    set_params.append(json.dumps(v))
                elif k == "favorite_genres":
                    set_clauses.append("favorite_genres = ?")
                    set_params.append(json.dumps(v))
                elif k == "favorite_artists":
                    set_clauses.append("favorite_artists = ?")
                    set_params.append(json.dumps(v))
                elif k == "metadata":
                    set_clauses.append("metadata = ?")
                    set_params.append(json.dumps(v))
                elif k == "result":
                    set_clauses.append("result = ?")
                    set_params.append(json.dumps(v) if v is not None else None)
                elif k == "completed_at":
                    set_clauses.append("completed_at = ?")
                    set_params.append(v.isoformat() if isinstance(v, datetime) else v)
                elif k == "revoked_at":
                    set_clauses.append("revoked_at = ?")
                    set_params.append(v.isoformat() if isinstance(v, datetime) else v)
                elif k == "dashboard_settings":
                    set_clauses.append("dashboard_settings = ?")
                    set_params.append(json.dumps(v))
                elif k == "high_contrast":
                    set_clauses.append("high_contrast = ?")
                    set_params.append(1 if v else 0)
                elif k in ("track_data", "insights"):
                    set_clauses.append(f"{k} = ?")
                    set_params.append(json.dumps(v))
                else:
                    set_clauses.append(f"{k} = ?")
                    set_params.append(v)
        
        if "$addToSet" in update:
            for k, v in update["$addToSet"].items():
                if k == "song_ids":
                    cursor.execute(f"SELECT song_ids FROM {self.table_name} {where_clause}", where_params)
                    row = cursor.fetchone()
                    if row:
                        current_ids = json.loads(row[0])
                        if v not in current_ids:
                            current_ids.append(v)
                            set_clauses.append("song_ids = ?")
                            set_params.append(json.dumps(current_ids))
        
        if "$pull" in update:
            for k, v in update["$pull"].items():
                if k == "song_ids":
                    cursor.execute(f"SELECT song_ids FROM {self.table_name} {where_clause}", where_params)
                    row = cursor.fetchone()
                    if row:
                        current_ids = json.loads(row[0])
                        if v in current_ids:
                            current_ids.remove(v)
                            set_clauses.append("song_ids = ?")
                            set_params.append(json.dumps(current_ids))
        
        if set_clauses:
            cursor.execute(f"UPDATE {self.table_name} SET {', '.join(set_clauses)} {where_clause}", set_params + where_params)
            self.db.conn.commit()
        
        class UpdateResult:
            def __init__(self, modified_count, matched_count):
                self.modified_count = modified_count
                self.matched_count = matched_count
        return UpdateResult(cursor.rowcount if set_clauses else 0, cursor.rowcount if set_clauses else 0)

    def _build_where_clause(self, query):
        if not query:
            return "", []
        
        conditions = []
        params = []
        
        for k, v in query.items():
            if k == "_id":
                conditions.append("id = ?")
                params.append(str(v))
            elif k == "user_id":
                conditions.append("user_id = ?")
                params.append(str(v))
            elif k == "song_id":
                conditions.append("song_id = ?")
                params.append(str(v))
            elif k == "token":
                conditions.append("token = ?")
                params.append(str(v))
            elif v is None:
                conditions.append(f"{k} IS NULL")
            elif isinstance(v, dict):
                for op, val in v.items():
                    if op == "$lt":
                        conditions.append(f"{k} < ?")
                        params.append(val.isoformat() if isinstance(val, datetime) else val)
                    elif op == "$gte":
                        conditions.append(f"{k} >= ?")
                        params.append(val.isoformat() if isinstance(val, datetime) else val)
                    elif op == "$in":
                        placeholders = ', '.join(['?' for _ in val])
                        conditions.append(f"{k} IN ({placeholders})")
                        params.extend([str(x) for x in val])
            else:
                conditions.append(f"{k} = ?")
                params.append(v.isoformat() if isinstance(v, datetime) else v)
        
        return f"WHERE {' AND '.join(conditions)}" if conditions else "", params

    def _row_to_dict(self, row):
        d = dict(row)
        # Convert JSON strings back to lists/dicts
        if "genre" in d and isinstance(d["genre"], str):
            d["genre"] = json.loads(d["genre"])
        if "mood_tags" in d and isinstance(d["mood_tags"], str):
            d["mood_tags"] = json.loads(d["mood_tags"])
        if "features" in d and isinstance(d["features"], str):
            d["features"] = json.loads(d["features"])
        if "preferences" in d and isinstance(d["preferences"], str):
            d["preferences"] = json.loads(d["preferences"])
        if "favorite_genres" in d and isinstance(d["favorite_genres"], str):
            d["favorite_genres"] = json.loads(d["favorite_genres"])
        if "favorite_artists" in d and isinstance(d["favorite_artists"], str):
            d["favorite_artists"] = json.loads(d["favorite_artists"])
        if "metadata" in d and isinstance(d["metadata"], str):
            d["metadata"] = json.loads(d["metadata"])
        if "song_ids" in d and isinstance(d["song_ids"], str):
            d["song_ids"] = json.loads(d["song_ids"])
        if "result" in d and isinstance(d["result"], str):
            d["result"] = json.loads(d["result"])
        if "dashboard_settings" in d and isinstance(d["dashboard_settings"], str):
            d["dashboard_settings"] = json.loads(d["dashboard_settings"])
        if "track_data" in d and isinstance(d["track_data"], str):
            d["track_data"] = json.loads(d["track_data"])
        if "insights" in d and isinstance(d["insights"], str):
            d["insights"] = json.loads(d["insights"])
        if "high_contrast" in d:
            d["high_contrast"] = bool(d["high_contrast"])
        
        # Convert datetime strings back to datetime objects
        datetime_keys = {
            "played_at", "liked_at", "created_at", "updated_at", 
            "completed_at", "expires_at", "revoked_at", "saved_at"
        }
        for k in datetime_keys:
            if k in d and isinstance(d[k], str) and d[k]:
                try:
                    val_clean = d[k].replace("Z", "+00:00")
                    d[k] = datetime.fromisoformat(val_clean)
                except Exception:
                    try:
                        d[k] = datetime.fromisoformat(d[k].replace("Z", ""))
                    except Exception:
                        pass
        
        if "id" in d:
            d["_id"] = d["id"]
        return d


class SQLiteCursor:
    def __init__(self, db, table_name, query):
        self.db = db
        self.table_name = table_name
        self.query = query
        self.skip_val = 0
        self.limit_val = None
        self.sort_field = None
        self.sort_direction = 1

    def skip(self, val):
        self.skip_val = val
        return self

    def limit(self, val):
        self.limit_val = val
        return self

    def sort(self, field, direction=1):
        self.sort_field = field
        self.sort_direction = direction
        return self

    async def to_list(self, length=None):
        cursor = self.db.conn.cursor()
        where_clause, params = self._build_where_clause()
        order_clause = self._build_order_clause()
        limit_clause = self._build_limit_clause()
        
        cursor.execute(f"SELECT * FROM {self.table_name} {where_clause} {order_clause} {limit_clause}", params)
        rows = cursor.fetchall()
        
        dicts = []
        collection = self.db[self.table_name]
        for row in rows:
            d = collection._row_to_dict(row)
            dicts.append(d)
        
        if length is not None:
            dicts = dicts[:length]
        
        return dicts

    def __aiter__(self):
        return self

    async def __anext__(self):
        if not hasattr(self, '_iter_data'):
            self._iter_data = iter(await self.to_list())
        try:
            return next(self._iter_data)
        except StopIteration:
            raise StopAsyncIteration

    def _build_where_clause(self):
        if not self.query:
            return "", []
        
        conditions = []
        params = []
        
        for k, v in self.query.items():
            if k == "_id":
                conditions.append("id = ?")
                params.append(str(v))
            elif k == "user_id":
                conditions.append("user_id = ?")
                params.append(str(v))
            elif k == "song_id":
                conditions.append("song_id = ?")
                params.append(str(v))
            elif k == "token":
                conditions.append("token = ?")
                params.append(str(v))
            elif v is None:
                conditions.append(f"{k} IS NULL")
            elif isinstance(v, dict):
                for op, val in v.items():
                    if op == "$lt":
                        conditions.append(f"{k} < ?")
                        params.append(val)
                    elif op == "$gte":
                        conditions.append(f"{k} >= ?")
                        params.append(val)
                    elif op == "$in":
                        placeholders = ', '.join(['?' for _ in val])
                        conditions.append(f"{k} IN ({placeholders})")
                        params.extend([str(x) for x in val])
            else:
                conditions.append(f"{k} = ?")
                params.append(v)
        
        return f"WHERE {' AND '.join(conditions)}" if conditions else "", params

    def _build_order_clause(self):
        if self.sort_field:
            direction = "DESC" if self.sort_direction == -1 else "ASC"
            return f"ORDER BY {self.sort_field} {direction}"
        return ""

    def _build_limit_clause(self):
        clauses = []
        if self.limit_val:
            clauses.append(f"LIMIT {self.limit_val}")
        if self.skip_val:
            clauses.append(f"OFFSET {self.skip_val}")
        return " ".join(clauses)
