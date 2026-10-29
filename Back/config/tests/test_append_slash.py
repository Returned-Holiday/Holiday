from django.test import TestCase

from apps.accounts.models import User
from config.tests.test_not_found import fingerprint


# 슬래시 없는 요청도 같은 404 (상태·본문·헤더)
class NoAppendSlashTests(TestCase):
    def assert_same_404(self, existing: str, missing: str) -> None:
        with self.subTest(existing=existing):
            found = self.client.get(existing)
            self.assertEqual(found.status_code, 404)
            self.assertNotIn("Location", found.headers)
            self.assertEqual(fingerprint(found), fingerprint(self.client.get(missing)))

    def test_anonymous(self) -> None:
        self.assert_same_404("/api/admin/incidents", "/api/admin/nothing")
        self.assert_same_404("/api/incidents/999999", "/api/nothing")
        self.assert_same_404("/api/auth/me", "/api/auth/nothing")
        self.assert_same_404("/api/reports", "/api/nothing")

    def test_member(self) -> None:
        self.client.force_login(User.objects.create_user(email="member@example.com", nickname="member"))
        self.assert_same_404("/api/admin/incidents", "/api/admin/nothing")

    def test_slash_path_still_works(self) -> None:
        self.assertEqual(self.client.get("/api/auth/csrf/").status_code, 204)
