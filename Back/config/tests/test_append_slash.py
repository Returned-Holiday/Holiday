from django.test import TestCase

from apps.accounts.models import User


# 끝 슬래시 없는 요청도 경로 존재 여부와 무관하게 같은 404 (리다이렉트로 노출 X)
class NoAppendSlashTests(TestCase):
    def assert_same_404(self, existing: str, missing: str) -> None:
        with self.subTest(existing=existing):
            found = self.client.get(existing)
            absent = self.client.get(missing)
            self.assertEqual(found.status_code, 404)
            self.assertNotIn("Location", found.headers)
            self.assertEqual((found.status_code, found.content), (absent.status_code, absent.content))

    def test_anonymous(self) -> None:
        self.assert_same_404("/api/admin/incidents", "/api/admin/nothing")
        self.assert_same_404("/api/incidents/999999", "/api/nothing")
        self.assert_same_404("/api/auth/me", "/api/auth/nothing")

    def test_member(self) -> None:
        self.client.force_login(User.objects.create_user(email="member@example.com", nickname="member"))
        self.assert_same_404("/api/admin/incidents", "/api/admin/nothing")

    def test_slash_path_still_works(self) -> None:
        self.assertEqual(self.client.get("/api/auth/csrf/").status_code, 204)
