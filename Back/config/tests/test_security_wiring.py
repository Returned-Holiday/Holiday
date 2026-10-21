import logging
from datetime import timedelta

from django.conf import settings
from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import User
from common.log_filters import PiiMaskingFilter


def _index(name: str) -> int:
    return settings.MIDDLEWARE.index(name)


# 실제 설정 그대로 연결 확인 (테스트용 미들웨어 추가 X)
class MiddlewareWiringTests(TestCase):
    def test_order(self) -> None:
        self.assertEqual(_index("common.middleware.NoStoreApiMiddleware"), 1)
        otp = _index("django_otp.middleware.OTPMiddleware")
        audit = _index("common.middleware.AdminAuditMiddleware")
        expiry = _index("common.middleware.PasswordExpiryMiddleware")
        self.assertLess(otp, audit)
        self.assertLess(audit, expiry)
        self.assertLess(expiry, _index("axes.middleware.AxesMiddleware"))

    def test_expired_user_blocked(self) -> None:
        user = User.objects.create_user(email="member@example.com", nickname="member")
        User.objects.filter(pk=user.pk).update(password_changed_at=timezone.now() - timedelta(days=90))
        self.client.force_login(user)
        response = self.client.get("/api/incidents/")
        self.assertEqual(response.status_code, 403)
        self.assertEqual(response.json()["code"], "PASSWORD_EXPIRED")
        self.assertIn("no-store", response["Cache-Control"])
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)

    def test_member_api_not_cached(self) -> None:
        self.assertIn("no-store", self.client.get("/api/auth/me/")["Cache-Control"])

    def test_admin_request_audited_once(self) -> None:
        with self.assertLogs("app.audit", "INFO") as logs:
            self.client.get("/api/admin/incidents/")
        self.assertEqual(len(logs.output), 1)


class LoggingWiringTests(TestCase):
    def test_every_handler_masks(self) -> None:
        for name, handler in settings.LOGGING["handlers"].items():
            with self.subTest(handler=name):
                self.assertIn("pii_mask", handler["filters"])

    def test_retention_groups_separated(self) -> None:
        for logger_name in ("app", "app.security", "app.audit", "axes", "django.security"):
            with self.subTest(logger=logger_name):
                logger = logging.getLogger(logger_name)
                self.assertFalse(logger.propagate)
                self.assertTrue(
                    all(any(isinstance(f, PiiMaskingFilter) for f in h.filters) for h in logger.handlers)
                )
        handlers = {id(h) for name in ("app", "app.security", "app.audit") for h in logging.getLogger(name).handlers}
        self.assertEqual(len(handlers), 3)
        security = logging.getLogger("app.security").handlers
        self.assertEqual(logging.getLogger("django.security").handlers, security)

    def test_csrf_failure_logged_as_security_event(self) -> None:
        client = self.client_class(enforce_csrf_checks=True)
        with self.assertLogs("django.security", "WARNING"):
            client.post("/api/auth/login/", {}, content_type="application/json")
