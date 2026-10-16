from django.conf import settings
from django.core.validators import MaxLengthValidator
from django.db import models
from django.db.models import Q

from apps.incidents.constants import COMPANY_NAME_MAX_LENGTH
from apps.reports.constants import ReportStatus
from common.masking import mask_pii
from common.validators import LEAK_ITEMS_TEXT_MAX_LENGTH, REJECT_REASON_MAX_LENGTH, URL_MAX_LENGTH, validate_https_url


class Report(models.Model):
    # 탈퇴 시 함께 삭제
    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports")
    company_name = models.CharField(max_length=COMPANY_NAME_MAX_LENGTH)
    source_url = models.CharField(max_length=URL_MAX_LENGTH, validators=[validate_https_url])
    notified_at = models.DateField(null=True, blank=True)
    leak_items_text = models.TextField(validators=[MaxLengthValidator(LEAK_ITEMS_TEXT_MAX_LENGTH)])
    status = models.CharField(max_length=20, choices=ReportStatus.choices, default=ReportStatus.PENDING)
    reject_reason = models.TextField(null=True, blank=True, validators=[MaxLengthValidator(REJECT_REASON_MAX_LENGTH)])
    # 사고 삭제 시 연결만 해제
    linked_incident = models.ForeignKey(
        "incidents.Incident", on_delete=models.SET_NULL, null=True, blank=True, related_name="reports"
    )
    # 관리자 계정 삭제 X (검수 추적)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="reviewed_reports",
        db_column="reviewed_by",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "reports"
        constraints = [
            models.CheckConstraint(condition=Q(status__in=ReportStatus.values), name="ck_reports_status"),
            models.CheckConstraint(
                condition=~Q(status=ReportStatus.REJECTED) | (Q(reject_reason__isnull=False) & ~Q(reject_reason="")),
                name="ck_reports_reject_reason",
            ),
            models.CheckConstraint(
                condition=Q(status=ReportStatus.PENDING) | Q(reviewed_by__isnull=False, reviewed_at__isnull=False),
                name="ck_reports_reviewed",
            ),
        ]

    # 원문 DB 저장 X, bulk_create·update는 save() 우회 → Semgrep rh-mask-bypass로 차단
    def save(self, *args: object, **kwargs: object) -> None:
        self.leak_items_text = mask_pii(self.leak_items_text)
        super().save(*args, **kwargs)
