from datetime import timedelta

from django.conf import settings
from django.contrib.sessions.models import Session
from django.core.cache import cache
from django.test import TestCase
from django.test.client import Client
from django.utils import timezone

from apps.accounts.models import User
from apps.accounts.tests.helpers import create_member, random_password

EMAIL = "member@example.com"
LOGIN_URL = "/api/auth/login/"
ME_URL = "/api/auth/me/"


# BE-B 보안 리뷰 보강: 비밀번호 변경·탈퇴 후 세션 (실제 로그인 API 경유, 기본 케이스는 test_password_withdraw.py)
class AccountSessionReviewTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.user, self.password = create_member(EMAIL)
        # 최소 사용 1일 지난 상태
        User.objects.filter(pk=self.user.pk).update(password_changed_at=timezone.now() - timedelta(days=2))

    def login(self, password: str) -> Client:
        client = Client()
        response = client.post(LOGIN_URL, {"email": EMAIL, "password": password}, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        return client

    def session_id(self, client: Client) -> str:
        return client.cookies[settings.SESSION_COOKIE_NAME].value

    def test_password_change_ends_other_device_sessions(self) -> None:
        current, other = self.login(self.password), self.login(self.password)
        before = self.session_id(current)
        new = random_password()
        response = current.post("/api/auth/password/", {"current_password": self.password, "new_password": new},
                                content_type="application/json")
        self.assertEqual(response.status_code, 204)
        # 바꾼 기기는 세션 ID 재발급 후 유지, 다른 기기는 즉시 로그아웃
        self.assertNotEqual(self.session_id(current), before)
        self.assertEqual(current.get(ME_URL).status_code, 200)
        self.assertEqual(other.get(ME_URL).status_code, 401)
        # 옛 비밀번호로 다시 로그인 X
        rejected = Client().post(LOGIN_URL, {"email": EMAIL, "password": self.password}, content_type="application/json")
        self.assertEqual(rejected.status_code, 401)

    def test_withdrawn_session_cookie_rejected(self) -> None:
        client = self.login(self.password)
        stolen = self.session_id(client)
        response = client.post("/api/auth/withdraw/", {"current_password": self.password},
                               content_type="application/json")
        self.assertEqual(response.status_code, 204)
        replay = Client()
        replay.cookies[settings.SESSION_COOKIE_NAME] = stolen
        self.assertEqual(replay.get(ME_URL).status_code, 401)

    # 사용자 행 삭제만으로도 401 → 세션 행 자체 파기 확인 (docs/security.md 3-9)
    def test_withdraw_deletes_all_device_sessions(self) -> None:
        current, other = self.login(self.password), self.login(self.password)
        keys = [self.session_id(current), self.session_id(other)]
        self.assertEqual(Session.objects.filter(session_key__in=keys).count(), 2)
        current.post("/api/auth/withdraw/", {"current_password": self.password}, content_type="application/json")
        self.assertFalse(Session.objects.filter(session_key__in=keys).exists())

    def test_withdrawn_account_cannot_login(self) -> None:
        client = self.login(self.password)
        client.post("/api/auth/withdraw/", {"current_password": self.password}, content_type="application/json")
        response = Client().post(LOGIN_URL, {"email": EMAIL, "password": self.password},
                                 content_type="application/json")
        self.assertEqual(response.status_code, 401)
        self.assertFalse(User.objects.filter(email=EMAIL).exists())
