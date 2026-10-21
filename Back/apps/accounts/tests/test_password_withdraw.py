from datetime import timedelta

from axes.models import AccessAttempt
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone
from rest_framework import status

from apps.accounts.models import PasswordHistory, User
from apps.accounts.services import create_member as create_member_with_history
from apps.accounts.tests.helpers import random_password
from apps.guides.models import SurveyResponse
from apps.guides.tests.helpers import make_incident, survey_payload

CHANGE_URL = "/api/auth/password/"
WITHDRAW_URL = "/api/auth/withdraw/"


def age(user: User, days: int) -> None:
    User.objects.filter(pk=user.pk).update(password_changed_at=timezone.now() - timedelta(days=days))


class PasswordChangeTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.current = random_password()
        self.user = create_member_with_history("member@example.com", self.current, "member")
        age(self.user, 2)
        self.client.force_login(self.user)

    def change(self, current: str, new: str, client: object = None, *, reset_throttle: bool = False) -> object:
        if reset_throttle:
            cache.clear()
        return (client or self.client).post(
            CHANGE_URL, {"current_password": current, "new_password": new}, content_type="application/json"
        )

    def test_changes_and_keeps_current_session(self) -> None:
        other = self.client_class()
        other.force_login(self.user)
        new = random_password()
        self.assertEqual(self.change(self.current, new).status_code, status.HTTP_204_NO_CONTENT)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(new))
        self.assertEqual(self.client.get("/api/auth/me/").status_code, status.HTTP_200_OK)
        # 다른 기기 세션 무효
        self.assertEqual(other.get("/api/auth/me/").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_wrong_or_missing_current(self) -> None:
        response = self.change(random_password(), random_password())
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("current_password", response.json()["fields"])
        response = self.client.post(CHANGE_URL, {"new_password": random_password()}, content_type="application/json")
        self.assertIn("current_password", response.json()["fields"])

    def test_min_age_unless_expired(self) -> None:
        age(self.user, 0)
        response = self.change(self.current, random_password())
        self.assertIn("new_password", response.json()["fields"])
        age(self.user, 90)
        # 만료로 강제 변경 → 1일 제한 예외, 만료 차단 미들웨어도 통과
        self.assertEqual(self.change(self.current, random_password()).status_code, status.HTTP_204_NO_CONTENT)

    def test_rejects_weak_password(self) -> None:
        response = self.change(self.current, "abc12345")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", response.json()["fields"])

    def test_history_reuse_and_size(self) -> None:
        used = [self.current]
        for _ in range(4):
            new = random_password()
            self.assertEqual(self.change(used[-1], new, reset_throttle=True).status_code, 204)
            used.append(new)
            age(self.user, 2)
        self.assertEqual(PasswordHistory.objects.filter(user=self.user).count(), 4)
        # 현재 + 최근 4개 재사용 X
        for reused in used[-4:]:
            with self.subTest(index=used.index(reused)):
                self.assertIn("new_password", self.change(used[-1], reused, reset_throttle=True).json()["fields"])
        # 5번째 전 비밀번호는 허용
        self.assertEqual(self.change(used[-1], used[0], reset_throttle=True).status_code, 204)

    def test_requires_csrf(self) -> None:
        client = self.client_class(enforce_csrf_checks=True)
        client.force_login(self.user)
        self.assertEqual(self.change(self.current, random_password(), client).status_code, 403)

    def test_rate_limited(self) -> None:
        for _ in range(5):
            self.change(random_password(), random_password())
        self.assertEqual(self.change(self.current, random_password()).status_code, 429)


class WithdrawTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.current = random_password()
        self.user = create_member_with_history("member@example.com", self.current, "member")
        self.client.force_login(self.user)

    def withdraw(self, current: str) -> object:
        return self.client.post(WITHDRAW_URL, {"current_password": current}, content_type="application/json")

    def test_removes_personal_data(self) -> None:
        incident = make_incident()
        self.client.put(f"/api/guides/incidents/{incident.pk}/survey/", survey_payload(), content_type="application/json")
        AccessAttempt.objects.create(username="member@example.com", ip_address="203.0.113.1", user_agent="test",
                                     failures_since_start=1)
        other = self.client_class()
        other.force_login(self.user)
        self.assertEqual(self.withdraw(self.current).status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(email="member@example.com").exists())
        self.assertFalse(SurveyResponse.objects.exists())
        self.assertFalse(PasswordHistory.objects.exists())
        self.assertFalse(AccessAttempt.objects.filter(username="member@example.com").exists())
        # 공식 정보 유지, 모든 세션 종료
        self.assertTrue(type(incident).objects.filter(pk=incident.pk).exists())
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
        self.assertEqual(other.get("/api/auth/me/").status_code, 401)

    def test_wrong_password_rejected(self) -> None:
        response = self.withdraw(random_password())
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("current_password", response.json()["fields"])
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

    def test_admin_cannot_withdraw(self) -> None:
        User.objects.filter(pk=self.user.pk).update(is_staff=True)
        self.assertEqual(self.withdraw(self.current).status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(User.objects.filter(pk=self.user.pk).exists())

    def test_requires_login(self) -> None:
        self.client.logout()
        self.assertEqual(self.withdraw(make_password(random_password())).status_code, 401)
