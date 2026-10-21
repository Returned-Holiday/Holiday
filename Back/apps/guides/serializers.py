from rest_framework import serializers

from apps.guides.constants import (
    ACTION_INCIDENT_ERROR,
    DB_ID_MAX,
    SELECTED_ITEMS_MAX,
    SELECTION_ERROR,
    TRIGGER_EMPTY_ERROR,
    TRIGGER_REQUIRED_ERROR,
    Answer,
    Certainty,
    LeakItemsAnswer,
    PublishStatus,
    TriggerType,
)
from apps.guides.models import Action
from apps.incidents.services import incident_exists

# 선택지 에러에 입력값 X (DRF 기본 문구는 입력값 포함)
CHOICE_ERRORS = {"invalid_choice": "선택지에서 골라 주세요."}


def _answer_field() -> serializers.ChoiceField:
    return serializers.ChoiceField(choices=Answer.choices, error_messages=CHOICE_ERRORS)


class SurveyInputSerializer(serializers.Serializer):
    leak_items_answer = serializers.ChoiceField(choices=LeakItemsAnswer.choices, error_messages=CHOICE_ERRORS)
    selected_item_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1, max_value=DB_ID_MAX),
        max_length=SELECTED_ITEMS_MAX,
        allow_empty=True,
    )
    payment_linked = _answer_field()
    reused_password = _answer_field()
    impersonation_contact = _answer_field()
    damage_occurred = _answer_field()

    # 선택 항목은 이 사고의 "유출" 항목만, 항목 선택일 때만 (교차 검증)
    def validate(self, attrs: dict) -> dict:
        ids = attrs["selected_item_ids"]
        allowed: frozenset[int] = self.context["leaked_item_ids"]
        if attrs["leak_items_answer"] == LeakItemsAnswer.SELECTED:
            valid = bool(ids) and len(set(ids)) == len(ids) and set(ids) <= allowed
        else:
            valid = not ids
        if not valid:
            raise serializers.ValidationError({"selected_item_ids": [SELECTION_ERROR]})
        return attrs


class SurveyOutputSerializer(serializers.Serializer):
    leak_items_answer = serializers.CharField()
    selected_item_ids = serializers.ListField(child=serializers.IntegerField())
    payment_linked = serializers.CharField()
    reused_password = serializers.CharField()
    impersonation_contact = serializers.CharField()
    damage_occurred = serializers.CharField()


class ChecklistActionSerializer(serializers.Serializer):
    id = serializers.IntegerField(source="action.pk")
    priority = serializers.IntegerField(source="action.priority")
    title = serializers.CharField(source="action.title")
    # ERD에 없는 컬럼, 항상 null (docs/api.md)
    summary = serializers.SerializerMethodField()
    steps = serializers.CharField(source="action.steps")
    source_url = serializers.CharField(source="action.source_url", allow_null=True)
    reason = serializers.CharField()
    certainty = serializers.ChoiceField(choices=Certainty.choices)
    is_new = serializers.BooleanField()
    completed = serializers.BooleanField()

    def get_summary(self, item: object) -> None:
        return None


class ChecklistSerializer(serializers.Serializer):
    incident_id = serializers.IntegerField(source="incident.pk")
    company_name = serializers.CharField(source="incident.company.name")
    source_url = serializers.CharField(source="incident.source_url")
    contact_info = serializers.CharField(source="incident.contact_info", allow_null=True)
    notice_revised = serializers.BooleanField()
    leak_items_unknown = serializers.BooleanField(source="response.leak_items_unknown")
    completed_count = serializers.IntegerField()
    total_count = serializers.IntegerField()
    actions = ChecklistActionSerializer(many=True, source="items")


ACTION_FIELDS = ("trigger_type", "leak_type", "survey_key", "priority", "title", "steps", "source_url", "status")


class AdminActionQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=PublishStatus.choices, required=False, error_messages=CHOICE_ERRORS)
    incident_id = serializers.IntegerField(min_value=1, max_value=DB_ID_MAX, required=False)


class AdminActionSerializer(serializers.ModelSerializer):
    incident_id = serializers.IntegerField(allow_null=True)

    class Meta:
        model = Action
        fields = ("id", "incident_id", *ACTION_FIELDS, "published_at")
        read_only_fields = fields


class AdminActionInputSerializer(serializers.ModelSerializer):
    incident_id = serializers.IntegerField(min_value=1, max_value=DB_ID_MAX, allow_null=True, required=False)

    class Meta:
        model = Action
        fields = ("incident_id", *ACTION_FIELDS)
        extra_kwargs = {
            field: {"error_messages": CHOICE_ERRORS} for field in ("trigger_type", "leak_type", "survey_key", "status")
        }

    def validate_incident_id(self, value: int | None) -> int | None:
        if value is not None and not incident_exists(value):
            raise serializers.ValidationError(ACTION_INCIDENT_ERROR)
        return value

    def validate_source_url(self, value: str | None) -> str | None:
        return value or None

    # 트리거별 필수값 (DB 제약 전에 400), 수정은 기존 값과 합쳐서 판단
    def validate(self, attrs: dict) -> dict:
        merged = {
            field: attrs.get(field, getattr(self.instance, field, None))
            for field in ("incident_id", "trigger_type", "leak_type", "survey_key")
        }
        errors = trigger_field_errors(**merged)
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


def trigger_field_errors(
    incident_id: int | None, trigger_type: str | None, leak_type: str | None, survey_key: str | None
) -> dict[str, list[str]]:
    required = {
        TriggerType.LEAK_TYPE: ("leak_type", leak_type),
        TriggerType.SURVEY: ("survey_key", survey_key),
        TriggerType.ALWAYS: ("incident_id", incident_id),
    }
    if trigger_type not in required:
        return {"trigger_type": [CHOICE_ERRORS["invalid_choice"]]}
    errors: dict[str, list[str]] = {}
    field, value = required[trigger_type]
    if value is None:
        errors[field] = [TRIGGER_REQUIRED_ERROR]
    for other, other_value in (("leak_type", leak_type), ("survey_key", survey_key)):
        if other != field and other_value is not None:
            errors[other] = [TRIGGER_EMPTY_ERROR]
    return errors
