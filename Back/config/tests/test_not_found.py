import re

from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponse
from django.test import TestCase
from django_otp import DEVICE_ID_SESSION_KEY
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.accounts.models import User
from apps.incidents.models import Company, Incident

NGINX_CONF = settings.BASE_DIR.parent / "infra" / "nginx" / "returnedholiday.conf"
# 시각 따라 바뀌는 헤더만 제외
VOLATILE_HEADERS = {"Expires", "Date"}


def fingerprint(response: HttpResponse) -> tuple[int, bytes, dict[str, str]]:
    headers = {key: value for key, value in response.headers.items() if key not in VOLATILE_HEADERS}
    return response.status_code, response.content, headers


# 404만으로 경로·리소스 존재 구분 X
class UniformNotFoundTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        company = Company.objects.create(name="테스트기업")
        self.private = Incident.objects.create(company=company, notified_at="2026-10-01", summary="요약",
                                               source_url="https://example.com")
        self.baseline = fingerprint(self.client.get("/api/no-such-path/"))

    def assert_same_as_missing_path(self, url: str) -> None:
        with self.subTest(url=url):
            self.assertEqual(fingerprint(self.client.get(url)), self.baseline)

    def test_baseline_is_not_found(self) -> None:
        status, body, headers = self.baseline
        self.assertEqual(status, 404)
        self.assertEqual(body.decode(), '{"code":"NOT_FOUND","message":"요청한 정보를 찾을 수 없습니다."}')
        self.assertNotIn("Allow", headers)

    def test_anonymous(self) -> None:
        for url in ("/api/admin/no-such-path/", "/api/admin/incidents/", f"/api/admin/incidents/{self.private.pk}/",
                    "/api/admin/reports/", f"/api/incidents/{self.private.pk}/", "/api/incidents/999999/"):
            self.assert_same_as_missing_path(url)

    def test_member_and_staff_without_otp(self) -> None:
        for user in (User.objects.create_user(email="member@example.com", nickname="member"),
                     User.objects.create_user(email="admin@example.com", nickname="admin", is_staff=True)):
            self.client.force_login(user)
            self.assertEqual(self.client.get("/api/no-such-path/").content, self.baseline[1])
            self.assert_same_as_missing_path("/api/admin/incidents/")
            self.assert_same_as_missing_path(f"/api/incidents/{self.private.pk}/")

    def test_admin_missing_object(self) -> None:
        admin = User.objects.create_user(email="admin@example.com", nickname="admin", is_staff=True)
        self.client.force_login(admin)
        device = TOTPDevice.objects.create(user=admin, name="test", confirmed=True)
        session = self.client.session
        session[DEVICE_ID_SESSION_KEY] = device.persistent_id
        session.save()
        baseline = self.client.get("/api/no-such-path/")
        for url in ("/api/admin/incidents/999999/", "/api/admin/reports/999999/"):
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.content, baseline.content)
                self.assertNotIn("Allow", response.headers)

    def test_method_not_allowed_keeps_allow(self) -> None:
        response = self.client.post(f"/api/incidents/{self.private.pk}/")
        self.assertEqual(response.status_code, 405)
        self.assertIn("Allow", response.headers)

    # nginx 차단 본문도 같은 바이트
    def test_nginx_admin_block_matches(self) -> None:
        conf = NGINX_CONF.read_text(encoding="utf-8")
        admin_block = conf[conf.index("location /api/admin/"):]
        body = re.search(r"return 404 '([^']*)';", admin_block).group(1)
        self.assertEqual(body.encode(), self.baseline[1])
        self.assertIn("default_type application/json;", admin_block)
        self.assertEqual(self.baseline[2]["Content-Type"], "application/json")
