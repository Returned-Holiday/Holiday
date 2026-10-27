from django.core.cache import cache
from django.test import TestCase

from apps.accounts.models import User
from apps.reports.tests.helpers import REPORTS_URL, report_payload


# 비로그인(csrf_protect)·로그인(DRF) CSRF 실패 응답 구분 X
class CsrfFailureResponseTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.client = self.client_class(enforce_csrf_checks=True)

    def drf_forbidden(self) -> tuple[bytes, str]:
        user = User.objects.create_user(email="member@example.com", nickname="member")
        client = self.client_class(enforce_csrf_checks=True)
        client.force_login(user)
        response = client.post(REPORTS_URL, report_payload(), content_type="application/json")
        self.assertEqual(response.status_code, 403)
        return response.content, response["Content-Type"]

    def test_signup_and_login_same_as_drf(self) -> None:
        expected = self.drf_forbidden()
        self.assertEqual(expected[0].decode(), '{"code":"FORBIDDEN","message":"요청을 처리할 권한이 없습니다."}')
        for url in ("/api/auth/signup/", "/api/auth/login/"):
            with self.subTest(url=url):
                response = self.client.post(url, {}, content_type="application/json")
                self.assertEqual(response.status_code, 403)
                self.assertEqual((response.content, response["Content-Type"]), expected)
                self.assertIn("no-store", response["Cache-Control"])
