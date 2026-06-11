import unittest
from uuid import uuid4

from fastapi import HTTPException

from app.routes.analysis import complete_analysis, create_analysis
from app.routes.auth import login, logout, me, register
from app.schemas.analysis import AnalysisComplete, AnalysisCreate
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services.auth_service import hash_password, verify_password


def unique_user():
    suffix = uuid4().hex
    return {
        "email": f"user-{suffix}@example.com",
        "username": f"user{suffix[:8]}",
        "password": "StrongPass123",
    }


class AuthAndAnalysisTests(unittest.IsolatedAsyncioTestCase):
    async def register_user(self):
        payload = unique_user()
        token = await register(RegisterRequest(**payload))
        return payload, token.access_token

    async def test_user_registration_and_session_persistence(self):
        payload, token = await self.register_user()

        first = await me(authorization=f"Bearer {token}")
        second = await me(authorization=f"Bearer {token}")

        self.assertEqual(first.email, payload["email"])
        self.assertEqual(second.email, payload["email"])

    async def test_duplicate_registration_prevention(self):
        payload, _ = await self.register_user()

        with self.assertRaises(HTTPException) as ctx:
            await register(RegisterRequest(**payload))

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Email already registered", ctx.exception.detail)

    async def test_login_success(self):
        payload, _ = await self.register_user()
        response = await login(LoginRequest(email=payload["email"], password=payload["password"]))

        self.assertTrue(response.access_token)

    async def test_login_failure(self):
        payload, _ = await self.register_user()

        with self.assertRaises(HTTPException) as ctx:
            await login(LoginRequest(email=payload["email"], password="WrongPass123"))

        self.assertEqual(ctx.exception.status_code, 401)
        self.assertEqual(ctx.exception.detail, "Invalid email or password")

    async def test_logout_revokes_session(self):
        _, token = await self.register_user()

        await logout(authorization=f"Bearer {token}")

        with self.assertRaises(HTTPException) as ctx:
            await me(authorization=f"Bearer {token}")

        self.assertEqual(ctx.exception.status_code, 401)

    async def test_single_active_analysis_restriction(self):
        _, token = await self.register_user()
        authorization = f"Bearer {token}"

        first = await create_analysis(AnalysisCreate(track_name="Blue Signal"), authorization=authorization)
        with self.assertRaises(HTTPException) as ctx:
            await create_analysis(AnalysisCreate(track_name="Red Signal"), authorization=authorization)

        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(
            ctx.exception.detail,
            "You already have an analysis in progress. Please wait for it to complete.",
        )

        complete = await complete_analysis(
            first.id,
            AnalysisComplete(result={"summary": "done"}),
            authorization=authorization,
        )
        third = await create_analysis(AnalysisCreate(track_name="Green Signal"), authorization=authorization)

        self.assertEqual(complete.status, "completed")
        self.assertEqual(third.status, "pending")

    def test_password_verification(self):
        password = "StrongPass123"
        password_hash = hash_password(password)

        self.assertTrue(verify_password(password, password_hash))
        self.assertFalse(verify_password("WrongPass123", password_hash))


if __name__ == "__main__":
    unittest.main()
