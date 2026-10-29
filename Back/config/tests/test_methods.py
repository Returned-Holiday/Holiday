from django.core.cache import cache
from django.test import TestCase
from django_otp import DEVICE_ID_SESSION_KEY
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.accounts.models import User
from config.tests.test_not_found import fingerprint

MEMBER_URLS = ("/api/auth/signup/", "/api/auth/login/", "/api/auth/me/", "/api/incidents/", "/api/guides/incidents/1/survey/")


# OPTIONS 메타데이터(뷰 이름·입력 필드) 노출 X
class OptionsMetadataTests(TestCase):
    def setUp(self) -> None:
        cache.clear()

    def assert_no_metadata(self, url: str, expected: int) -> None:
        with self.subTest(url=url):
            response = self.client.options(url)
            self.assertEqual(response.status_code, expected)
            self.assertNotIn(b"renders", response.content)
            self.assertNotIn(b"actions", response.content)

    def test_member_and_public(self) -> None:
        self.client.force_login(User.objects.create_user(email="member@example.com", nickname="member"))
        for url in MEMBER_URLS:
            self.assert_no_metadata(url, 405)

    def test_admin_api(self) -> None:
        self.assert_no_metadata("/api/admin/incidents/", 404)
        # 없는 경로 404와 상태·본문·헤더 동일 (OPTIONS로 관리자 API 존재 노출 X)
        missing = fingerprint(self.client.get("/api/no-such-path/"))
        self.assertEqual(fingerprint(self.client.options("/api/admin/incidents/")), missing)
        admin = User.objects.create_user(email="admin@example.com", nickname="admin", is_staff=True)
        self.client.force_login(admin)
        device = TOTPDevice.objects.create(user=admin, name="test", confirmed=True)
        session = self.client.session
        session[DEVICE_ID_SESSION_KEY] = device.persistent_id
        session.save()
        self.assert_no_metadata("/api/admin/incidents/", 405)
