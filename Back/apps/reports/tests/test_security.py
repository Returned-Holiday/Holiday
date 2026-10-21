import datetime

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from django.http import HttpResponse
from django.test import TestCase, modify_settings
from django.utils import timezone

from apps.accounts.models import User
from apps.incidents.models import Company, Incident
from apps.reports.constants import ReportStatus
from apps.reports.models import Report
from apps.reports.tests.helpers import ADMIN_REPORTS_URL, REPORTS_URL, login_admin, report_payload
from common.validators import DB_ID_MAX, LEAK_ITEMS_TEXT_MAX_LENGTH, REJECT_REASON_MAX_LENGTH

AUDIT_MIDDLEWARE = "common.middleware.AdminAuditMiddleware"


class ReportTestBase(TestCase):
    def setUp(self) -> None:
        self.reporter = User.objects.create_user(email="reporter@example.com", nickname="reporter")
        self.admin = User.objects.create_user(email="admin@example.com", nickname="admin", is_staff=True)

    def make_report(self, **fields: object) -> Report:
        values = {
            "reporter": self.reporter,
            "company_name": "테스트기업",
            "source_url": "https://example.com/notice",
            "leak_items_text": "이름, 연락처",
        }
        values.update(fields)
        return Report.objects.create(**values)


class ReportMaskingTests(ReportTestBase):
    def test_masks_before_insert(self) -> None:
        report = self.make_report(leak_items_text="제 번호 010-1234-5678 유출")
        report.refresh_from_db()
        self.assertEqual(report.leak_items_text, "제 번호 010-1234-**** 유출")

    def test_masks_before_update(self) -> None:
        report = self.make_report()
        report.leak_items_text = "메일 member@example.com"
        report.save()
        report.refresh_from_db()
        self.assertNotIn("member@", report.leak_items_text)


class ReportConstraintTests(ReportTestBase):
    def test_default_pending(self) -> None:
        self.assertEqual(self.make_report().status, ReportStatus.PENDING)

    def test_db_rejects_unknown_status(self) -> None:
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.make_report(status="HACKED")

    def test_reject_requires_reason(self) -> None:
        for reason in (None, ""):
            with self.subTest(reason=reason), self.assertRaises(IntegrityError), transaction.atomic():
                self.make_report(status=ReportStatus.REJECTED, reject_reason=reason, reviewed_by=self.admin,
                                 reviewed_at=timezone.now())

    def test_reviewed_requires_reviewer_and_time(self) -> None:
        for status in (ReportStatus.APPROVED, ReportStatus.REJECTED):
            for missing in ("reviewed_by", "reviewed_at"):
                fields = {"status": status, "reject_reason": "근거 없음", "reviewed_by": self.admin,
                          "reviewed_at": timezone.now(), missing: None}
                with self.subTest(status=status, missing=missing):
                    with self.assertRaises(IntegrityError), transaction.atomic():
                        self.make_report(**fields)

    def test_approve_with_reviewer_saved(self) -> None:
        report = self.make_report(status=ReportStatus.APPROVED, reviewed_by=self.admin, reviewed_at=timezone.now())
        self.assertEqual(report.reviewed_by, self.admin)

    def test_validates_https_url(self) -> None:
        report = Report(reporter=self.reporter, company_name="테스트기업", source_url="http://example.com",
                        leak_items_text="이름")
        with self.assertRaises(ValidationError) as ctx:
            report.full_clean()
        self.assertIn("source_url", ctx.exception.error_dict)


class ReportDeleteTests(ReportTestBase):
    def test_reporter_delete_removes_reports(self) -> None:
        self.make_report()
        self.reporter.delete()
        self.assertFalse(Report.objects.exists())

    def test_reviewer_not_deletable(self) -> None:
        self.make_report(status=ReportStatus.APPROVED, reviewed_by=self.admin, reviewed_at=timezone.now())
        with self.assertRaises(ProtectedError):
            self.admin.delete()

    def test_incident_delete_keeps_report(self) -> None:
        company = Company.objects.create(name="테스트기업")
        incident = Incident.objects.create(company=company, notified_at=datetime.date(2026, 10, 1), summary="요약",
                                           source_url="https://example.com/notice")
        report = self.make_report(linked_incident=incident)
        incident.delete()
        report.refresh_from_db()
        self.assertIsNone(report.linked_incident)


class ReportApiSecurityTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.user = User.objects.create_user(email="member@example.com", nickname="member")
        self.other = User.objects.create_user(email="other@example.com", nickname="other")
        self.client.force_login(self.user)

    def post(self, **fields: object) -> HttpResponse:
        return self.client.post(REPORTS_URL, report_payload(**fields), content_type="application/json")

    def test_anonymous_rejected(self) -> None:
        self.client.logout()
        self.assertEqual(self.client.get(REPORTS_URL).status_code, 401)
        self.assertEqual(self.post().status_code, 401)

    def test_server_fields_not_client_controlled(self) -> None:
        response = self.post(status="APPROVED", reporter=self.other.pk, reviewed_by=self.other.pk,
                             reject_reason="x", linked_incident=1)
        self.assertEqual(response.status_code, 201)
        report = Report.objects.get()
        self.assertEqual(report.status, ReportStatus.PENDING)
        self.assertEqual(report.reporter, self.user)
        self.assertIsNone(report.reviewed_by)
        self.assertIsNone(report.reject_reason)

    def test_invalid_input_rejected(self) -> None:
        cases = {
            "source_url": "http://example.com",
            "leak_items_text": "가" * (LEAK_ITEMS_TEXT_MAX_LENGTH + 1),
            "company_name": "가" * 101,
        }
        for field, value in cases.items():
            with self.subTest(field=field):
                response = self.post(**{field: value})
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.json()["fields"])
        self.assertFalse(Report.objects.exists())

    def test_only_own_reports_and_no_detail_api(self) -> None:
        Report.objects.create(reporter=self.other, company_name="남의 제보", source_url="https://example.com",
                              leak_items_text="이름")
        mine = self.post().json()["data"]["id"]
        self.assertEqual([row["id"] for row in self.client.get(REPORTS_URL).json()["data"]["results"]], [mine])
        self.assertEqual(self.client.get(f"{REPORTS_URL}{mine}/").status_code, 404)

    def test_create_limited_per_day(self) -> None:
        for _ in range(5):
            self.assertEqual(self.post().status_code, 201)
        response = self.post()
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.json()["code"], "RATE_LIMITED")
        self.assertEqual(self.client.get(REPORTS_URL).status_code, 200)

    def test_security_log_has_no_content(self) -> None:
        with self.assertLogs("app.security", "INFO") as logs:
            self.post(company_name="비밀기업", leak_items_text="010-1234-5678")
        line = logs.output[0]
        self.assertIn(f"user_id={self.user.pk}", line)
        self.assertNotIn("비밀기업", line)
        self.assertNotIn("010", line)


class AdminReportSecurityTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.reporter = User.objects.create_user(email="reporter@example.com", nickname="reporter")
        self.admin = User.objects.create_user(email="admin@example.com", nickname="admin", is_staff=True)
        self.report = Report.objects.create(reporter=self.reporter, company_name="테스트기업",
                                            source_url="https://example.com", leak_items_text="이름")
        self.detail_url = f"{ADMIN_REPORTS_URL}{self.report.pk}/"

    def review(self, action: str, data: dict[str, object]) -> HttpResponse:
        return self.client.post(f"{self.detail_url}{action}/", data, content_type="application/json")

    def test_non_admin_hidden(self) -> None:
        for login in (None, self.reporter, self.admin):
            if login is not None:
                self.client.force_login(login)
            for url in (ADMIN_REPORTS_URL, self.detail_url):
                with self.subTest(user=login and login.nickname, url=url):
                    self.assertEqual(self.client.get(url).status_code, 404)
            with self.subTest(user=login and login.nickname, action="approve"):
                self.assertEqual(self.review("approve", {}).status_code, 404)
        self.report.refresh_from_db()
        self.assertEqual(self.report.status, ReportStatus.PENDING)

    def test_reporter_email_not_exposed(self) -> None:
        login_admin(self.client, self.admin)
        for url in (ADMIN_REPORTS_URL, self.detail_url):
            with self.subTest(url=url):
                self.assertNotIn("reporter@example.com", self.client.get(url).content.decode())

    def test_review_only_once(self) -> None:
        login_admin(self.client, self.admin)
        self.assertEqual(self.review("approve", {}).status_code, 200)
        for action, data in (("approve", {}), ("reject", {"reason": "중복"})):
            with self.subTest(action=action):
                response = self.review(action, data)
                self.assertEqual(response.status_code, 409)
                self.assertEqual(response.json()["code"], "CONFLICT")
        self.report.refresh_from_db()
        self.assertEqual(self.report.status, ReportStatus.APPROVED)

    def test_review_input_validated(self) -> None:
        login_admin(self.client, self.admin)
        cases = (
            ("reject", {}, "reason"),
            ("reject", {"reason": "   "}, "reason"),
            ("reject", {"reason": "가" * (REJECT_REASON_MAX_LENGTH + 1)}, "reason"),
            ("approve", {"incident_id": 999}, "incident_id"),
            ("approve", {"incident_id": "1 OR 1=1"}, "incident_id"),
            ("approve", {"incident_id": DB_ID_MAX + 1}, "incident_id"),
        )
        for action, data, field in cases:
            with self.subTest(action=action, data=data):
                response = self.review(action, data)
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.json()["fields"])
        self.report.refresh_from_db()
        self.assertEqual(self.report.status, ReportStatus.PENDING)

    def test_missing_report_404(self) -> None:
        login_admin(self.client, self.admin)
        response = self.client.post(f"{ADMIN_REPORTS_URL}{self.report.pk + 100}/approve/", {},
                                    content_type="application/json")
        self.assertEqual(response.status_code, 404)

    # 설정 연결 여부 무관 한 번만 (중복 기록 X)
    @modify_settings(MIDDLEWARE={"remove": AUDIT_MIDDLEWARE, "append": AUDIT_MIDDLEWARE})
    def test_audit_records_review_action(self) -> None:
        login_admin(self.client, self.admin)
        second = Report.objects.create(reporter=self.reporter, company_name="B", source_url="https://example.com",
                                       leak_items_text="이름")
        with self.assertLogs("app.audit", "INFO") as logs:
            self.review("approve", {})
            self.client.post(f"{ADMIN_REPORTS_URL}{second.pk}/reject/", {"reason": "중복"},
                             content_type="application/json")
        actions = [line.split("action=")[1].split()[0] for line in logs.output]
        self.assertEqual(actions, ["APPROVE", "REJECT"])
