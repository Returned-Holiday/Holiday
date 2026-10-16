from django.db import models


class ReportStatus(models.TextChoices):
    PENDING = "PENDING", "대기"
    APPROVED = "APPROVED", "승인"
    REJECTED = "REJECTED", "반려"
