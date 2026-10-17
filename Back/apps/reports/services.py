import logging

from django.contrib.auth.base_user import AbstractBaseUser
from django.db.models import QuerySet
from django.utils import timezone

from apps.reports.constants import ReportStatus
from apps.reports.exceptions import ReportAlreadyReviewed
from apps.reports.models import Report

security_logger = logging.getLogger("app.security")


# 상태는 모델 기본값 PENDING, 마스킹은 save()
def create_report(reporter: AbstractBaseUser, data: dict[str, object]) -> Report:
    report = Report.objects.create(reporter=reporter, **data)
    # 제보 내용 X, ID만
    security_logger.info("report_created user_id=%s report_id=%s", reporter.pk, report.pk)
    return report


def get_my_reports(user: AbstractBaseUser) -> QuerySet[Report]:
    return Report.objects.filter(reporter=user).order_by("-created_at", "-id")


# PENDING 행만 조건부 UPDATE 한 문장 → 동시 검수도 한 번만 반영 (TOCTOU X)
def _review(report_id: int, reviewer: AbstractBaseUser, **fields: object) -> None:
    updated = Report.objects.filter(pk=report_id, status=ReportStatus.PENDING).update(
        reviewed_by=reviewer, reviewed_at=timezone.now(), **fields
    )
    if updated == 0:
        raise ReportAlreadyReviewed
    security_logger.info(
        "report_reviewed admin_id=%s report_id=%s status=%s", reviewer.pk, report_id, fields["status"]
    )


def approve_report(report_id: int, reviewer: AbstractBaseUser, incident_id: int | None) -> None:
    _review(report_id, reviewer, status=ReportStatus.APPROVED, linked_incident_id=incident_id)


def reject_report(report_id: int, reviewer: AbstractBaseUser, reason: str) -> None:
    _review(report_id, reviewer, status=ReportStatus.REJECTED, reject_reason=reason)
