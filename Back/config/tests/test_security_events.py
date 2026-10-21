from datetime import timedelta

from django.core.cache import cache
from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.accounts.tests.helpers import random_password
from apps.reports.tests.helpers import REPORTS_URL, report_payload

SECURITY_LOGGER = "app.security"


def denied_lines(output: list[str]) -> list[str]:
    return [line for line in output if "api_denied" in line or "password_expired_blocked" in line]


# 403·429는 보안 이벤트 로그(90일)에 한 줄씩, 개인정보·경로 원문 X
class DeniedSecurityEventTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.user = User.objects.create_user(email="member@example.com", nickname="member")

    def test_csrf_failure_logged_with_session_user(self) -> None:
        client = self.client_class(enforce_csrf_checks=True)
        client.force_login(self.user)
        with self.assertLogs(SECURITY_LOGGER, "WARNING") as logs:
            response = client.post(REPORTS_URL, report_payload(), content_type="application/json")
        self.assertEqual(response.status_code, 403)
        lines = denied_lines(logs.output)
        self.assertEqual(len(lines), 1)
        for expected in ("status=403", f"user_id={self.user.pk}", "route=api/reports/"):
            self.assertIn(expected, lines[0])
        self.assertNotIn("member@example.com", lines[0])

    def test_throttled_logged(self) -> None:
        self.client.force_login(self.user)
        for _ in range(5):
            self.client.post(REPORTS_URL, report_payload(), content_type="application/json")
        with self.assertLogs(SECURITY_LOGGER, "WARNING") as logs:
            response = self.client.post(REPORTS_URL, report_payload(), content_type="application/json")
        self.assertEqual(response.status_code, 429)
        lines = denied_lines(logs.output)
        self.assertEqual(len(lines), 1)
        self.assertIn("status=429", lines[0])

    def test_expired_password_block_logged(self) -> None:
        User.objects.filter(pk=self.user.pk).update(password_changed_at=timezone.now() - timedelta(days=90))
        self.client.force_login(self.user)
        with self.assertLogs(SECURITY_LOGGER, "WARNING") as logs:
            self.assertEqual(self.client.get("/api/incidents/").status_code, 403)
        lines = denied_lines(logs.output)
        self.assertEqual(len(lines), 1)
        self.assertIn(f"password_expired_blocked user_id={self.user.pk}", lines[0])

    def test_unauthenticated_not_logged_as_denied(self) -> None:
        with self.assertNoLogs(SECURITY_LOGGER, "WARNING"):
            self.assertEqual(self.client.get(REPORTS_URL).status_code, 401)

    def test_login_lock_not_logged_twice(self) -> None:
        credentials = {"email": "member@example.com", "password": random_password()}
        with self.assertLogs(SECURITY_LOGGER, "WARNING") as logs:
            for _ in range(6):
                self.client.post("/api/auth/login/", credentials, content_type="application/json")
        self.assertTrue(any("login locked" in line for line in logs.output))
        self.assertEqual(denied_lines(logs.output), [])
