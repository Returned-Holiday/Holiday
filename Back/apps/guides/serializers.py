from rest_framework import serializers

from apps.guides.constants import SELECTED_ITEMS_MAX, Answer, Certainty, LeakItemsAnswer

# 선택지 에러에 입력값 X (DRF 기본 문구는 입력값 포함)
CHOICE_ERRORS = {"invalid_choice": "선택지에서 골라 주세요."}
SELECTION_ERROR = "이 사고의 유출 항목에서 골라 주세요."


def _answer_field() -> serializers.ChoiceField:
    return serializers.ChoiceField(choices=Answer.choices, error_messages=CHOICE_ERRORS)


class SurveyInputSerializer(serializers.Serializer):
    leak_items_answer = serializers.ChoiceField(choices=LeakItemsAnswer.choices, error_messages=CHOICE_ERRORS)
    selected_item_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), max_length=SELECTED_ITEMS_MAX, allow_empty=True
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
