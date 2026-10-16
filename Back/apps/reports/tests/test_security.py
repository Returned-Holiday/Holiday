import datetime

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.incidents.models import Company, Incident
from apps.reports.constants import ReportStatus
from apps.reports.models import Report


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
