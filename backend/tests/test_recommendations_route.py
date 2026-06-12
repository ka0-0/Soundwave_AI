import unittest
import sys
import os
from uuid import uuid4
from fastapi import BackgroundTasks

# Add backend directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.routes.recommendations import recommendations_dashboard
from app.routes.auth import register
from app.schemas.auth import RegisterRequest

def unique_user():
    suffix = uuid4().hex
    return {
        "email": f"user-{suffix}@example.com",
        "username": f"user{suffix[:8]}",
        "password": "StrongPass123",
    }

class RecommendationsRouteTests(unittest.IsolatedAsyncioTestCase):
    async def test_dashboard_route(self):
        # 1. Register a new user
        payload = unique_user()
        token = await register(RegisterRequest(**payload))
        
        # 2. Query recommendations dashboard
        bg = BackgroundTasks()
        dashboard = await recommendations_dashboard(background_tasks=bg, authorization=f"Bearer {token.access_token}")
        
        self.assertTrue(dashboard["insufficient_history"])
        self.assertIsNone(dashboard["insights"])
        self.assertEqual(dashboard["recommendations"], [])
        self.assertEqual(dashboard["artists_you_may_like"], [])
        self.assertEqual(dashboard["trending_for_you"], [])
        print("[OK] Dashboard route unit test passed.")

if __name__ == "__main__":
    unittest.main()
