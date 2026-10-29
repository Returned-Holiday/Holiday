import datetime

from django.core.cache import cache
from django.test import TestCase

from apps.accounts.models import User
from apps.incidents.models import Company, Incident
from apps.reports.constants import ReportStatus
from apps.reports.models import Report
from apps.reports.tests.helpers import ADMIN_REPORTS_URL, REPORTS_URL, login_admin, report_payload


class MyReportApiTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.user = User.objects.create_user(email="member@example.com", nickname="member")
        self.client.force_login(self.user)

    def test_create_returns_id_and_saves_masked(self) -> None:
        response = self.client.post(REPORTS_URL, report_payload(leak_items_text="카드 1234-5678-9012-3456 유출"),
                                    content_type="application/json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(set(response.json()["data"]), {"id"})
        report = Report.objects.get(pk=response.json()["data"]["id"])
        self.assertEqual(report.reporter, self.user)
        self.assertEqual(report.status, ReportStatus.PENDING)
        self.assertNotIn("9012-3456", report.leak_items_text)

    def test_list_newest_first_with_review_result(self) -> None:
        old = Report.objects.create(reporter=self.user, company_name="A", source_url="https://example.com",
                                    leak_items_text="이름")
        new = Report.objects.create(reporter=self.user, company_name="B", source_url="https://example.com",
                                    leak_items_text="이름")
        Report.objects.filter(pk=old.pk).update(
            status=ReportStatus.REJECTED, reject_reason="공식 발표 확인 불가",
            reviewed_by=User.objects.create_user(email="admin@example.com", nickname="admin", is_staff=True),
            reviewed_at=datetime.datetime(2026, 10, 2, tzinfo=datetime.UTC),
        )
        rows = self.client.get(REPORTS_URL).json()["data"]["results"]
        self.assertEqual([row["id"] for row in rows], [new.pk, old.pk])
        self.assertEqual(rows[1]["status"], "REJECTED")
        self.assertEqual(rows[1]["reject_reason"], "공식 발표 확인 불가")
        self.assertEqual(set(rows[0]), {"id", "company_name", "created_at", "status", "reject_reason", "reviewed_at"})


class AdminReportApiTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.reporter = User.objects.create_user(email="reporter@example.com", nickname="reporter")
        self.admin = User.objects.create_user(email="admin@example.com", nickname="admin", is_staff=True)
        login_admin(self.client, self.admin)
        self.report = Report.objects.create(reporter=self.reporter, company_name="테스트기업",
                                            source_url="https://example.com", leak_items_text="이름")

    def test_list_with_status_filter(self) -> None:
        rows = self.client.get(ADMIN_REPORTS_URL, {"status": "PENDING"}).json()["data"]["results"]
        self.assertEqual([row["id"] for row in rows], [self.report.pk])
        self.assertEqual(rows[0]["reporter_nickname"], "reporter")
        self.assertEqual(self.client.get(ADMIN_REPORTS_URL, {"status": "APPROVED"}).json()["data"]["results"], [])

    def test_approve_links_incident(self) -> None:
        incident = Incident.objects.create(company=Company.objects.create(name="테스트기업"),
                                           notified_at=datetime.date(2026, 10, 1), summary="요약",
                                           source_url="https://example.com")
        response = self.client.post(f"{ADMIN_REPORTS_URL}{self.report.pk}/approve/", {"incident_id": incident.pk},
                                    content_type="application/json")
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["status"], "APPROVED")
        self.assertEqual(data["linked_incident_id"], incident.pk)
        self.report.refresh_from_db()
        self.assertEqual(self.report.reviewed_by, self.admin)
        self.assertIsNotNone(self.report.reviewed_at)

    def test_approve_without_incident(self) -> None:
        response = self.client.post(f"{ADMIN_REPORTS_URL}{self.report.pk}/approve/", {},
                                    content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["data"]["linked_incident_id"])

    def test_reject_shows_reason_to_reporter(self) -> None:
        response = self.client.post(f"{ADMIN_REPORTS_URL}{self.report.pk}/reject/", {"reason": " 출처 확인 불가 "},
                                    content_type="application/json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["reject_reason"], "출처 확인 불가")
        self.client.force_login(self.reporter)
        self.assertEqual(self.client.get(REPORTS_URL).json()["data"]["results"][0]["reject_reason"], "출처 확인 불가")
