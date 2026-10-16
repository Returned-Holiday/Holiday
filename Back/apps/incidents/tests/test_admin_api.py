from unittest import mock

from django.core.cache import cache
from django.db.models import RestrictedError
from django.test import TestCase, modify_settings
from django.test.client import Client
from django_otp import DEVICE_ID_SESSION_KEY
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.accounts.models import User
from apps.incidents.constants import IncidentStatus, LeakType
from apps.incidents.models import Company, Incident, IncidentLeakItem
from apps.incidents.tests.helpers import make_incident

BASE = "/api/admin/incidents/"
COMPANIES = f"{BASE}companies/"


def login_admin(client: Client, user: User) -> None:
    client.force_login(user)
    device = TOTPDevice.objects.create(user=user, name="test", confirmed=True)
    session = client.session
    session[DEVICE_ID_SESSION_KEY] = device.persistent_id
    session.save()


class AdminApiTestBase(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.admin = User.objects.create_user(email="admin@example.com", nickname="admin", is_staff=True)
        login_admin(self.client, self.admin)
        self.company = Company.objects.create(name="SK텔레콤", aliases=["skt"])

    def incident_payload(self, **fields: object) -> dict[str, object]:
        payload = {
            "company_id": self.company.pk,
            "notified_at": "2026-10-01",
            "summary": "요약",
            "source_url": "https://example.com/notice",
        }
        payload.update(fields)
        return payload


class AdminAccessTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        incident = make_incident(Company.objects.create(name="테스트기업"))
        self.urls = [BASE, f"{BASE}{incident.pk}/", COMPANIES]

    def assert_hidden(self, client: Client) -> None:
        for url in self.urls:
            with self.subTest(url=url):
                response = client.get(url)
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.json()["code"], "NOT_FOUND")

    def test_anonymous_hidden(self) -> None:
        self.assert_hidden(self.client)

    def test_member_hidden(self) -> None:
        self.client.force_login(User.objects.create_user(email="member@example.com", nickname="member"))
        self.assert_hidden(self.client)

    def test_staff_without_otp_hidden(self) -> None:
        self.client.force_login(User.objects.create_user(email="admin@example.com", nickname="admin", is_staff=True))
        self.assert_hidden(self.client)

    def test_staff_with_otp_allowed(self) -> None:
        login_admin(self.client, User.objects.create_user(email="admin@example.com", nickname="admin", is_staff=True))
        for url in self.urls:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url).status_code, 200)


class AdminCompanyApiTests(AdminApiTestBase):
    def test_create_normalizes_aliases(self) -> None:
        response = self.client.post(COMPANIES, {"name": "KT", "aliases": [" 케이 티 ", "ＫＴ올레"]},
                                    content_type="application/json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["data"]["aliases"], ["케이티", "kt올레"])

    def test_duplicate_name_or_alias_conflict(self) -> None:
        cases = {
            "alias": {"name": "KT", "aliases": ["SKT"]},
            "fullwidth_alias": {"name": "KT", "aliases": ["ＳＫＴ"]},
            "alias_equals_name": {"name": "KT", "aliases": ["sk 텔레콤"]},
            "name": {"name": "SK텔레콤"},
        }
        for name, payload in cases.items():
            with self.subTest(case=name):
                response = self.client.post(COMPANIES, payload, content_type="application/json")
                self.assertEqual(response.status_code, 409)
                self.assertEqual(response.json()["code"], "CONFLICT")
        self.assertEqual(Company.objects.count(), 1)

    def test_invalid_aliases_rejected(self) -> None:
        for aliases in (["a"] * 21, ["a" * 51], [" "]):
            with self.subTest(count=len(aliases)):
                response = self.client.post(COMPANIES, {"name": "KT", "aliases": aliases},
                                            content_type="application/json")
                self.assertEqual(response.status_code, 400)

    def test_update_conflict_and_success(self) -> None:
        kt = Company.objects.create(name="KT")
        url = f"{COMPANIES}{kt.pk}/"
        self.assertEqual(self.client.patch(url, {"aliases": ["skt"]}, content_type="application/json").status_code, 409)
        response = self.client.patch(url, {"aliases": ["케이티"]}, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["aliases"], ["케이티"])


class AdminIncidentApiTests(AdminApiTestBase):
    def test_create_always_private(self) -> None:
        response = self.client.post(BASE, self.incident_payload(status="PUBLIC", notice_revised_at="2026-01-01T00:00:00Z"),
                                    content_type="application/json")
        self.assertEqual(response.status_code, 201)
        data = response.json()["data"]
        self.assertEqual(data["status"], IncidentStatus.PRIVATE)
        self.assertEqual(data["response_status"], "ONGOING")
        self.assertIsNone(data["notice_revised_at"])
        self.assertEqual(Incident.objects.get().status, IncidentStatus.PRIVATE)

    def test_create_validation(self) -> None:
        cases = {
            "company_id": self.company.pk + 100,
            "source_url": "http://example.com",
            "affected_count": -1,
            "response_status": "HACKED",
        }
        for field, value in cases.items():
            with self.subTest(field=field):
                response = self.client.post(BASE, self.incident_payload(**{field: value}),
                                            content_type="application/json")
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.json()["fields"])

    def test_list_includes_private_with_filters(self) -> None:
        private = make_incident(self.company)
        public = make_incident(Company.objects.create(name="KT"), status=IncidentStatus.PUBLIC)
        IncidentLeakItem.objects.create(incident=private, leak_type=LeakType.CONTACT, label="이름", is_leaked=True)
        rows = self.client.get(BASE).json()["data"]["results"]
        self.assertEqual({row["id"] for row in rows}, {private.pk, public.pk})
        self.assertEqual(next(row for row in rows if row["id"] == private.pk)["leak_item_count"], 1)
        self.assertEqual([row["id"] for row in self.client.get(BASE, {"status": "PUBLIC"}).json()["data"]["results"]],
                         [public.pk])
        self.assertEqual([row["id"] for row in self.client.get(BASE, {"q": "skt"}).json()["data"]["results"]],
                         [private.pk])
        self.assertEqual(self.client.get(BASE, {"status": "HACKED"}).status_code, 400)

    def test_put_and_delete_not_allowed(self) -> None:
        url = f"{BASE}{make_incident(self.company).pk}/"
        self.assertEqual(self.client.put(url, self.incident_payload(), content_type="application/json").status_code, 405)
        self.assertEqual(self.client.delete(url).status_code, 405)

    @modify_settings(MIDDLEWARE={"append": "common.middleware.AdminAuditMiddleware"})
    def test_publish_recorded_as_publish(self) -> None:
        url = f"{BASE}{make_incident(self.company).pk}/"
        with self.assertLogs("app.audit", "INFO") as logs:
            self.client.patch(url, {"status": "PUBLIC"}, content_type="application/json")
            self.client.patch(url, {"summary": "수정"}, content_type="application/json")
            self.client.patch(url, {"status": "PRIVATE"}, content_type="application/json")
        actions = [line.split("action=")[1].split()[0] for line in logs.output]
        self.assertEqual(actions, ["PUBLISH", "UPDATE", "UNPUBLISH"])

    def test_admin_fields_exact(self) -> None:
        incident = make_incident(self.company)
        IncidentLeakItem.objects.create(incident=incident, leak_type=LeakType.CONTACT, label="이름", is_leaked=True)
        data = self.client.get(f"{BASE}{incident.pk}/").json()["data"]
        self.assertEqual(set(data), {"id", "company_id", "occurred_at", "notified_at", "affected_count", "source_url",
                                     "contact_info", "summary", "status", "response_status", "notice_revised_at",
                                     "leak_items"})
        self.assertEqual(set(data["leak_items"][0]), {"id", "label", "is_leaked", "leak_type"})


class AdminLeakItemApiTests(AdminApiTestBase):
    def setUp(self) -> None:
        super().setUp()
        self.incident = make_incident(self.company)
        self.item = IncidentLeakItem.objects.create(incident=self.incident, leak_type=LeakType.CONTACT, label="이름",
                                                    is_leaked=True)
        self.url = f"{BASE}{self.incident.pk}/leak-items/"

    def revised_at(self) -> object:
        self.incident.refresh_from_db()
        return self.incident.notice_revised_at

    def test_add_marks_notice_revised(self) -> None:
        response = self.client.post(self.url, {"label": "카드번호", "is_leaked": False, "leak_type": "FINANCIAL"},
                                    content_type="application/json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(len(response.json()["data"]["leak_items"]), 2)
        self.assertIsNotNone(self.revised_at())

    def test_update_and_delete_mark_notice_revised(self) -> None:
        item_url = f"{self.url}{self.item.pk}/"
        response = self.client.patch(item_url, {"label": "휴대전화번호"}, content_type="application/json")
        self.assertEqual(response.status_code, 200)
        first = self.revised_at()
        self.assertIsNotNone(first)
        self.assertEqual(self.client.delete(item_url).status_code, 204)
        self.assertGreater(self.revised_at(), first)
        self.assertFalse(IncidentLeakItem.objects.exists())

    def test_item_of_other_incident_not_found(self) -> None:
        other = make_incident(self.company)
        url = f"{BASE}{other.pk}/leak-items/{self.item.pk}/"
        self.assertEqual(self.client.patch(url, {"label": "x"}, content_type="application/json").status_code, 404)
        self.assertEqual(self.client.delete(url).status_code, 404)
        self.item.refresh_from_db()
        self.assertEqual(self.item.label, "이름")

    def test_invalid_leak_type_rejected(self) -> None:
        response = self.client.post(self.url, {"label": "x", "is_leaked": True, "leak_type": "HACKED"},
                                    content_type="application/json")
        self.assertEqual(response.status_code, 400)
        self.assertIsNone(self.revised_at())

    def test_selected_item_delete_conflict(self) -> None:
        with mock.patch.object(IncidentLeakItem, "delete", side_effect=RestrictedError("restricted", set())):
            response = self.client.delete(f"{self.url}{self.item.pk}/")
        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.json()["code"], "CONFLICT")
        self.assertIsNone(self.revised_at())
