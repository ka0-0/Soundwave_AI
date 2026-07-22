import asyncio
import json
import logging
from bson import ObjectId

# Setup logging to see what engine does
logging.basicConfig(level=logging.INFO)

async def test_recs():
    # Import app database and recommendation engine
    from app.database import db
    from app.services.recommendation_engine import get_dashboard_recommendations, recommend
    
    # Get a test user
    cursor = db._sqlite_db.conn.cursor()
    cursor.execute("SELECT id, email, username FROM users LIMIT 1")
    row = cursor.fetchone()
    if not row:
        print("No users found in database!")
        return
    
    user_id = row[0]
    email = row[1]
    username = row[2]
    print(f"Testing recommendations for User ID: {user_id} ({email})")
    
    # Run dashboard recommendations
    print("\n=== RUNNING get_dashboard_recommendations ===")
    res = await get_dashboard_recommendations(user_id)
    
    print("\nKeys returned by dashboard recommendations:", res.keys())
    
    recs = res.get("recommendations", [])
    print(f"\nReturned {len(recs)} main recommendations:")
    for i, t in enumerate(recs[:3]):
        print(f"Track {i}: ID={t.get('id')}, Title='{t.get('title')}', Artist='{t.get('artist')}'")
        print(f"  preview_url: {t.get('preview_url')}")
        print(f"  audio_url: {t.get('audio_url')}")
        print(f"  preview: {t.get('preview')}")
        print(f"  src: {t.get('src')}")
        print(f"  source: {t.get('source')}")
        
    trending = res.get("trending_for_you", [])
    print(f"\nReturned {len(trending)} trending tracks:")
    for i, t in enumerate(trending[:3]):
        print(f"Track {i}: ID={t.get('id')}, Title='{t.get('title')}', Artist='{t.get('artist')}'")
        print(f"  preview_url: {t.get('preview_url')}")
        
    groups = res.get("recommendation_groups", {})
    print(f"\nRecommendation groups: {list(groups.keys())}")
    for group_key, group in list(groups.items())[:2]:
        print(f"Group '{group_key}' title: '{group.get('title')}'")
        tracks = group.get("tracks", [])
        if tracks:
            t = tracks[0]
            print(f"  First track: Title='{t.get('title')}', preview_url={t.get('preview_url')}")

    # Run legacy recommend
    print("\n=== RUNNING recommend (legacy) ===")
    legacy_recs = await recommend(user_id, limit=3)
    for i, t in enumerate(legacy_recs):
        print(f"Legacy Track {i}: ID={t.get('_id') or t.get('id')}, Title='{t.get('title')}'")
        print(f"  preview_url: {t.get('preview_url')}")
        print(f"  audio_url: {t.get('audio_url')}")
        print(f"  preview: {t.get('preview')}")
        print(f"  src: {t.get('src')}")

if __name__ == "__main__":
    import os
    import sys
    sys.path.append(os.path.join(os.getcwd(), "backend"))
    asyncio.run(test_recs())
