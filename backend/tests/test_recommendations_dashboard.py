import asyncio
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import db
from app.services.recommendation_engine import (
    build_user_taste_profile,
    generate_recs_pipeline,
    get_dashboard_recommendations,
    invalidate_dashboard_cache
)

async def test_recommendations():
    print("=== TESTING RECOMMENDATION ENGINE ===")
    
    # 1. Setup mock/test user
    user_id = "test_user_123"
    
    # Clean up old records for this test user
    await db.recently_played.delete_many({"user_id": user_id})
    await db.favorites.delete_many({"user_id": user_id})
    
    print("\n--- Test Case 1: Insufficient History ---")
    profile = await build_user_taste_profile(user_id)
    print("Insufficient History flag:", profile["insufficient_history"])
    assert profile["insufficient_history"] is True, "Should have insufficient history"
    
    dashboard = await generate_recs_pipeline(user_id)
    assert dashboard["insufficient_history"] is True
    assert dashboard["insights"] is None
    assert dashboard["recommendations"] == []
    print("[OK] Case 1 passed: Insufficient history correctly configured.")
    
    print("\n--- Test Case 2: Sufficient History (Seeding) ---")
    # Seed recently played songs
    # Imagine Dragons, Coldplay, The Weeknd
    mock_plays = [
        {
            "user_id": user_id,
            "song_id": "track_1",
            "played_at": "2026-06-12T10:00:00Z",
            "track_data": {
                "id": "track_1",
                "title": "Believer",
                "artist": "Imagine Dragons",
                "genre": ["Alternative", "Rock"],
                "duration": 204
            }
        },
        {
            "user_id": user_id,
            "song_id": "track_2",
            "played_at": "2026-06-12T10:05:00Z",
            "track_data": {
                "id": "track_2",
                "title": "Yellow",
                "artist": "Coldplay",
                "genre": ["Alternative", "Rock"],
                "duration": 269
            }
        },
        {
            "user_id": user_id,
            "song_id": "track_3",
            "played_at": "2026-06-12T10:10:00Z",
            "track_data": {
                "id": "track_3",
                "title": "Blinding Lights",
                "artist": "The Weeknd",
                "genre": ["Pop"],
                "duration": 200
            }
        }
    ]
    
    for play in mock_plays:
        await db.recently_played.insert_one(play)
        
    # Seed favorites
    await db.favorites.insert_one({
        "user_id": user_id,
        "track_id": "track_3",
        "created_at": "2026-06-12T10:10:00Z",
        "track_data": {
            "id": "track_3",
            "title": "Blinding Lights",
            "artist": "The Weeknd",
            "genre": ["Pop"],
            "duration": 200
        }
    })
    
    profile = await build_user_taste_profile(user_id)
    print("Insufficient History flag after seeding:", profile["insufficient_history"])
    print("Top Artists:", profile["top_artists"])
    print("Top Genres:", profile["top_genres"])
    
    assert profile["insufficient_history"] is False, "Should have sufficient history now"
    assert "The Weeknd" in profile["top_artists"]
    assert "Imagine Dragons" in profile["top_artists"]
    assert "Coldplay" in profile["top_artists"]
    assert "pop" in profile["top_genres"]
    
    print("\n--- Test Case 3: Running Pipeline ---")
    dashboard = await generate_recs_pipeline(user_id)
    
    assert dashboard["insufficient_history"] is False
    assert dashboard["insights"] is not None
    print("AI Insights:")
    print("  Top Artist:", dashboard["insights"]["top_artist"])
    print("  Top Genre:", dashboard["insights"]["top_genre"])
    print("  Hours Listened:", dashboard["insights"]["listening_hours_month"])
    print("  Sessions:", dashboard["insights"]["total_sessions"])
    print("  Confidence Score:", dashboard["insights"]["confidence_score"])
    
    assert dashboard["insights"]["top_genre"] in ["Pop", "Alternative", "Rock"]
    assert len(dashboard["recommendations"]) > 0, "Should generate recommendation tracks"
    print(f"Generated {len(dashboard['recommendations'])} recommendations.")
    
    # Check score normalization
    for rec in dashboard["recommendations"][:5]:
        score = rec["score"]
        print(f"  Track: {rec['title']} by {rec['artist']} | Match: {score}% | Reason: {rec['reason']}")
        assert 70 <= score <= 99, f"Score {score} out of 70-99% bounds"
        
    print("Artists you may like:")
    for artist in dashboard["artists_you_may_like"]:
        print(f"  Artist: {artist['name']} | Cover: {artist['cover_url']}")
        
    print("Trending for you:")
    for track in dashboard["trending_for_you"]:
        print(f"  Track: {track['title']} by {track['artist']}")
        
    print("\n--- Test Case 4: Caching & Invalidation ---")
    # Get dashboard recs (should cache them)
    res1 = await get_dashboard_recommendations(user_id)
    assert res1["insufficient_history"] is False
    
    # Invalidate cache
    await invalidate_dashboard_cache(user_id)
    
    print("\n[OK] All test cases passed successfully!")

if __name__ == "__main__":
    asyncio.run(test_recommendations())
