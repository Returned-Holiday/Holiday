from django.core.exceptions import ValidationError
from django.core.validators import MaxLengthValidator, MaxValueValidator
from django.db import models
from django.db.models import Q

from apps.incidents.constants import (
    AFFECTED_COUNT_MAX,
    COMPANY_NAME_MAX_LENGTH,
    LEAK_LABEL_MAX_LENGTH,
    IncidentStatus,
    LeakType,
    ResponseStatus,
)
from apps.incidents.validators import normalize_aliases, normalize_company_key
from common.models import TimeStampedModel
from common.validators import CONTACT_INFO_MAX_LENGTH, SUMMARY_MAX_LENGTH, URL_MAX_LENGTH, validate_https_url

ALIAS_CONFLICT_MESSAGE = "다른 기업의 이름이나 별칭과 겹쳐요."


class Company(models.Model):
    name = models.CharField(max_length=COMPANY_NAME_MAX_LENGTH, unique=True)
    # 정규화 값만 저장 (검색·OCR 매칭 기준)
    aliases = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "companies"

    def __str__(self) -> str:
        return self.name

    # JSON은 DB 유일 제약 불가 → 기업 간 중복 직접 검사
    def clean(self) -> None:
        super().clean()
        self.aliases = normalize_aliases(self.aliases)
        taken: set[str] = set()
        # 기업 수 적음 → 전체 비교 (JSON 검색은 DB마다 다름)
        for name, aliases in Company.objects.exclude(pk=self.pk).values_list("name", "aliases"):
            taken.add(normalize_company_key(name))
            taken.update(normalize_company_key(alias) for alias in aliases)
        errors = {}
        if normalize_company_key(self.name) in taken:
            errors["name"] = ValidationError(ALIAS_CONFLICT_MESSAGE, code="conflict")
        if taken.intersection(self.aliases):
            errors["aliases"] = ValidationError(ALIAS_CONFLICT_MESSAGE, code="conflict")
        if errors:
            raise ValidationError(errors)


class Incident(TimeStampedModel):
    # 사고 있는 기업 삭제 X
    company = models.ForeignKey(Company, on_delete=models.RESTRICT, related_name="incidents")
    occurred_at = models.DateField(null=True, blank=True)
    notified_at = models.DateField()
    affected_count = models.PositiveIntegerField(null=True, blank=True, validators=[MaxValueValidator(AFFECTED_COUNT_MAX)])
    # TEXT는 DB 길이 제한 X → 검증기
    summary = models.TextField(validators=[MaxLengthValidator(SUMMARY_MAX_LENGTH)])
    source_url = models.CharField(max_length=URL_MAX_LENGTH, validators=[validate_https_url])
    contact_info = models.TextField(null=True, blank=True, validators=[MaxLengthValidator(CONTACT_INFO_MAX_LENGTH)])
    # 신규 등록 기본 비공개
    status = models.CharField(max_length=20, choices=IncidentStatus.choices, default=IncidentStatus.PRIVATE)
    response_status = models.CharField(max_length=20, choices=ResponseStatus.choices, default=ResponseStatus.ONGOING)
    notice_revised_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "incidents"
        indexes = [models.Index(fields=["notified_at"], name="ix_incidents_notified_at")]
        constraints = [
            models.CheckConstraint(condition=Q(status__in=IncidentStatus.values), name="ck_incidents_status"),
            models.CheckConstraint(
                condition=Q(response_status__in=ResponseStatus.values), name="ck_incidents_response_status"
            ),
        ]


class IncidentLeakItem(models.Model):
    incident = models.ForeignKey(Incident, on_delete=models.CASCADE, related_name="leak_items")
    leak_type = models.CharField(max_length=30, choices=LeakType.choices)
    label = models.CharField(max_length=LEAK_LABEL_MAX_LENGTH)
    is_leaked = models.BooleanField()

    class Meta:
        db_table = "incident_leak_items"
        constraints = [
            models.CheckConstraint(condition=Q(leak_type__in=LeakType.values), name="ck_leak_items_leak_type"),
        ]
