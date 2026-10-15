from django.core.cache import cache
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import PasswordHistory, User
from apps.accounts.tests.helpers import create_member, random_password


class AuthApiTests(APITestCase):
    def setUp(self) -> None:
        cache.clear()
        self.client = APIClient()

    def signup_payload(self, **overrides: object) -> dict:
        payload = {
            "email": "New.Member@Example.com",
            "password": random_password(),
            "nickname": "새회원1",
            "agree_terms": True,
            "agree_privacy": True,
            "confirm_age": True,
        }
        payload.update(overrides)
        return payload

    def test_csrf_sets_cookie(self) -> None:
        response = self.client.get("/api/auth/csrf/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertIn("csrftoken", response.cookies)

    def test_signup(self) -> None:
        response = self.client.post("/api/auth/signup/", self.signup_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json(), {"data": {"nickname": "새회원1"}})
        user = User.objects.get(email="new.member@example.com")
        self.assertEqual(PasswordHistory.objects.filter(user=user).count(), 1)
        # 가입 후 자동 로그인 X
        self.assertEqual(self.client.get("/api/auth/me/").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_me_logout(self) -> None:
        user, raw = create_member()
        response = self.client.post("/api/auth/login/", {"email": "MEMBER@example.com", "password": raw}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.json()["data"]["password_expired"])

        me = self.client.get("/api/auth/me/").json()["data"]
        self.assertEqual(
            set(me), {"nickname", "email", "password_changed_at", "password_expired", "is_staff", "otp_verified"}
        )
        self.assertEqual(me["email"], user.email)
        self.assertFalse(me["otp_verified"])

        self.assertEqual(self.client.post("/api/auth/logout/").status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, status.HTTP_401_UNAUTHORIZED)
