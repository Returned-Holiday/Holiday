from django.conf import settings
from django.core.validators import MaxLengthValidator, MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q

from apps.guides.constants import (
    ACTION_TITLE_MAX_LENGTH,
    PRIORITY_MAX,
    PRIORITY_MIN,
    Answer,
    PublishStatus,
    SurveyKey,
    TriggerType,
)
from apps.incidents.constants import LeakType
from common.models import TimeStampedModel
from common.validators import STEPS_MAX_LENGTH, URL_MAX_LENGTH, validate_https_url

ANSWER_FIELDS = ("payment_linked", "reused_password", "impersonation_contact", "damage_occurred")


class Action(TimeStampedModel):
    # 비면 공통 조치, 사용자 기록 있는 사고 삭제 X
    incident = models.ForeignKey(
        "incidents.Incident", on_delete=models.RESTRICT, null=True, blank=True, related_name="special_actions"
    )
    trigger_type = models.CharField(max_length=20, choices=TriggerType.choices)
    leak_type = models.CharField(max_length=30, choices=LeakType.choices, null=True, blank=True)
    survey_key = models.CharField(max_length=30, choices=SurveyKey.choices, null=True, blank=True)
    priority = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(PRIORITY_MIN), MaxValueValidator(PRIORITY_MAX)]
    )
    title = models.CharField(max_length=ACTION_TITLE_MAX_LENGTH)
    # TEXT는 DB 길이 제한 X → 검증기
    steps = models.TextField(validators=[MaxLengthValidator(STEPS_MAX_LENGTH)])
    source_url = models.CharField(max_length=URL_MAX_LENGTH, null=True, blank=True, validators=[validate_https_url])
    # 신규 등록 기본 비공개
    status = models.CharField(max_length=20, choices=PublishStatus.choices, default=PublishStatus.PRIVATE)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "actions"
        constraints = [
            models.CheckConstraint(condition=Q(status__in=PublishStatus.values), name="ck_actions_status"),
            models.CheckConstraint(condition=Q(trigger_type__in=TriggerType.values), name="ck_actions_trigger_type"),
            models.CheckConstraint(
                condition=Q(leak_type__isnull=True) | Q(leak_type__in=LeakType.values), name="ck_actions_leak_type"
            ),
            models.CheckConstraint(
                condition=Q(survey_key__isnull=True) | Q(survey_key__in=SurveyKey.values), name="ck_actions_survey_key"
            ),
            models.CheckConstraint(
                condition=Q(priority__gte=PRIORITY_MIN, priority__lte=PRIORITY_MAX), name="ck_actions_priority"
            ),
            # 트리거별 필수값 (API 검증 누락 대비 DB에서도)
            models.CheckConstraint(
                condition=(
                    Q(trigger_type=TriggerType.LEAK_TYPE, leak_type__isnull=False, survey_key__isnull=True)
                    | Q(trigger_type=TriggerType.SURVEY, survey_key__isnull=False, leak_type__isnull=True)
                    | Q(
                        trigger_type=TriggerType.ALWAYS,
                        incident__isnull=False,
                        leak_type__isnull=True,
                        survey_key__isnull=True,
                    )
                ),
                name="ck_actions_trigger_fields",
            ),
        ]


class SurveyResponse(models.Model):
    # 탈퇴 시 함께 삭제
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="survey_responses")
    incident = models.ForeignKey("incidents.Incident", on_delete=models.RESTRICT, related_name="survey_responses")
    payment_linked = models.CharField(max_length=10, choices=Answer.choices)
    reused_password = models.CharField(max_length=10, choices=Answer.choices)
    impersonation_contact = models.CharField(max_length=10, choices=Answer.choices)
    damage_occurred = models.CharField(max_length=10, choices=Answer.choices)
    leak_items_unknown = models.BooleanField(default=False)
    selected_items = models.ManyToManyField(
        "incidents.IncidentLeakItem", through="SurveySelectedItem", related_name="survey_responses"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "survey_responses"
        constraints = [
            models.UniqueConstraint(fields=["user", "incident"], name="uq_survey_user_incident"),
            *(
                models.CheckConstraint(condition=Q(**{f"{field}__in": Answer.values}), name=f"ck_survey_{field}")
                for field in ANSWER_FIELDS
            ),
        ]


class SurveySelectedItem(models.Model):
    survey_response = models.ForeignKey(SurveyResponse, on_delete=models.CASCADE)
    # 사용자가 고른 항목 조용히 삭제 X (정정은 수정으로)
    leak_item = models.ForeignKey("incidents.IncidentLeakItem", on_delete=models.RESTRICT)

    class Meta:
        db_table = "survey_selected_items"
        constraints = [
            models.UniqueConstraint(fields=["survey_response", "leak_item"], name="uq_selected_item"),
        ]


class ActionCompletion(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="action_completions")
    incident = models.ForeignKey("incidents.Incident", on_delete=models.RESTRICT, related_name="action_completions")
    action = models.ForeignKey(Action, on_delete=models.RESTRICT, related_name="completions")
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "action_completions"
        constraints = [
            models.UniqueConstraint(fields=["user", "incident", "action"], name="uq_completion"),
        ]
