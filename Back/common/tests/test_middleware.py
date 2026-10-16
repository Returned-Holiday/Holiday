from datetime import timedelta

from django.http import HttpRequest, JsonResponse
from django.test import TestCase, modify_settings, override_settings
from django.urls import path
from django.utils import timezone

from apps.accounts.models import User

SECURITY_MIDDLEWARE = [
    "common.middleware.NoStoreApiMiddleware",
    "common.middleware.AdminAuditMiddleware",
    "common.middleware.PasswordExpiryMiddleware",
]


def ok_view(request: HttpRequest, **kwargs: object) -> JsonResponse:
    return JsonResponse({})


urlpatterns = [
    path("api/admin/things/<int:pk>/", ok_view),
    path("api/admin/notes/<str:slug>/", ok_view),
    path("api/things/", ok_view),
]


@modify_settings(MIDDLEWARE={"append": SECURITY_MIDDLEWARE})
class PasswordExpiryTests(TestCase):
    def setUp(self) -> None:
        self.user = User.objects.create_user(email="member@example.com", nickname="member")
        self.client.force_login(self.user)

    def set_password_age(self, days: int) -> None:
        self.user.password_changed_at = timezone.now() - timedelta(days=days)
        self.user.save(update_fields=["password_changed_at"])

    def test_expired_blocks_other_api(self) -> None:
        self.set_password_age(90)
        for method, url in (("get", "/api/incidents/"), ("post", "/api/reports/"), ("get", "/api/admin/incidents/")):
            with self.subTest(url=url):
                response = getattr(self.client, method)(url)
                self.assertEqual(response.status_code, 403)
                self.assertEqual(response.json()["code"], "PASSWORD_EXPIRED")

    def test_expired_allows_password_flow(self) -> None:
        self.set_password_age(365)
        self.assertEqual(self.client.get("/api/auth/csrf/").status_code, 204)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)
        self.assertEqual(self.client.post("/api/auth/logout/").status_code, 204)

    def test_before_expiry_not_blocked(self) -> None:
        self.set_password_age(89)
        self.assertNotEqual(self.client.get("/api/incidents/").status_code, 403)

    def test_anonymous_not_affected(self) -> None:
        self.client.logout()
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
        self.assertNotEqual(self.client.get("/api/incidents/").status_code, 403)


@modify_settings(MIDDLEWARE={"append": SECURITY_MIDDLEWARE})
class NoStoreTests(TestCase):
    def test_api_response_not_cached(self) -> None:
        self.assertIn("no-store", self.client.get("/api/auth/csrf/")["Cache-Control"])

    def test_blocked_response_not_cached(self) -> None:
        user = User.objects.create_user(email="member@example.com", nickname="member")
        user.password_changed_at = timezone.now() - timedelta(days=90)
        user.save(update_fields=["password_changed_at"])
        self.client.force_login(user)
        self.assertIn("no-store", self.client.get("/api/incidents/")["Cache-Control"])


@override_settings(ROOT_URLCONF=__name__)
@modify_settings(MIDDLEWARE={"append": SECURITY_MIDDLEWARE})
class AdminAuditTests(TestCase):
    def setUp(self) -> None:
        self.admin = User.objects.create_user(email="admin@example.com", nickname="admin", is_staff=True)

    def audit_line(self, method: str, url: str, **kwargs: object) -> str:
        with self.assertLogs("app.audit", "INFO") as logs:
            getattr(self.client, method)(url, **kwargs)
        self.assertEqual(len(logs.output), 1)
        return logs.output[0]

    def test_records_admin_route_target_and_status(self) -> None:
        self.client.force_login(self.admin)
        line = self.audit_line("get", "/api/admin/things/7/")
        for expected in (f"user_id={self.admin.pk}", "method=GET", "route=api/admin/things/<int:pk>/", "target=pk=7",
                         "status=200"):
            self.assertIn(expected, line)
        self.assertNotIn("admin@example.com", line)

    def test_request_body_not_recorded(self) -> None:
        self.client.force_login(self.admin)
        line = self.audit_line("post", "/api/admin/things/7/", data={"memo": "010-1234-5678"},
                               content_type="application/json")
        self.assertNotIn("memo", line)
        self.assertNotIn("010", line)

    def test_anonymous_and_unknown_path_recorded(self) -> None:
        line = self.audit_line("get", "/api/admin/unknown/")
        self.assertIn("user_id=None", line)
        self.assertIn("route=unresolved", line)
        self.assertIn("status=404", line)

    def test_text_in_url_not_recorded(self) -> None:
        line = self.audit_line("get", "/api/admin/notes/x%0Aforged/")
        self.assertNotIn("forged", line)
        self.assertNotIn("\n", line)

    def test_non_admin_api_not_recorded(self) -> None:
        with self.assertNoLogs("app.audit", "INFO"):
            self.client.get("/api/things/")
