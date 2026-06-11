import time
import asyncio
from pathlib import Path
import sys

# Add backend to path
backend_dir = Path(__file__).resolve().parent / "backend"
sys.path.append(str(backend_dir))

from app.database import db

async def run_db_benchmark():
    print("Benchmarking database queries directly...")
    
    t0 = time.perf_counter()
    # Find user by email
    user = await db.users.find_one({"email": "listener@soundwave.ai"})
    t1 = time.perf_counter()
    print(f"db.users.find_one took {(t1 - t0) * 1000:.2f}ms")
    
    if not user:
        print("User not found!")
        return
        
    user_id = user["id"]
    
    t0 = time.perf_counter()
    session = await db.auth_sessions.find_one({"user_id": user_id})
    t1 = time.perf_counter()
    print(f"db.auth_sessions.find_one took {(t1 - t0) * 1000:.2f}ms")
    
    t0 = time.perf_counter()
    searches = await db.user_searches.find({"user_id": user_id}).to_list(20)
    t1 = time.perf_counter()
    print(f"db.user_searches.find took {(t1 - t0) * 1000:.2f}ms")

if __name__ == "__main__":
    asyncio.run(run_db_benchmark())
