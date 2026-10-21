from rest_framework import serializers

from apps.incidents.constants import (
    ALIAS_MAX_LENGTH,
    ALIASES_MAX_COUNT,
    COMPANY_NAME_MAX_LENGTH,
    SEARCH_QUERY_MAX_LENGTH,
    IncidentStatus,
)
from apps.incidents.models import Company, Incident, IncidentLeakItem


class IncidentSearchQuerySerializer(serializers.Serializer):
    q = serializers.CharField(max_length=SEARCH_QUERY_MAX_LENGTH, required=False, allow_blank=True, default="")


class IncidentListSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    leaked_labels = serializers.SerializerMethodField()

    class Meta:
        model = Incident
        fields = ["id", "company_name", "notified_at", "response_status", "leaked_labels"]

    def get_leaked_labels(self, incident: Incident) -> list[str]:
        return [item.label for item in incident.leak_items.all() if item.is_leaked]


# leak_type은 내부 연결용 → 사용자 응답 X
class PublicLeakItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentLeakItem
        fields = ["id", "label", "is_leaked"]


class IncidentDetailSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    active_count = serializers.IntegerField(read_only=True)
    leak_items = PublicLeakItemSerializer(many=True, read_only=True)

    class Meta:
        model = Incident
        fields = [
            "id",
            "company_name",
            "notified_at",
            "occurred_at",
            "affected_count",
            "summary",
            "source_url",
            "contact_info",
            "response_status",
            "active_count",
            "leak_items",
        ]


class CompanyInputSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=COMPANY_NAME_MAX_LENGTH)
    aliases = serializers.ListField(
        child=serializers.CharField(max_length=ALIAS_MAX_LENGTH), max_length=ALIASES_MAX_COUNT, required=False
    )


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = ["id", "name", "aliases"]


class AdminIncidentQuerySerializer(serializers.Serializer):
    q = serializers.CharField(max_length=SEARCH_QUERY_MAX_LENGTH, required=False, allow_blank=True, default="")
    status = serializers.ChoiceField(choices=IncidentStatus.choices, required=False)


# status·notice_revised_at 등 서버 결정 값 X (신규는 항상 비공개)
class AdminIncidentInputSerializer(serializers.ModelSerializer):
    company_id = serializers.PrimaryKeyRelatedField(source="company", queryset=Company.objects.all())

    class Meta:
        model = Incident
        fields = [
            "company_id",
            "occurred_at",
            "notified_at",
            "affected_count",
            "source_url",
            "contact_info",
            "summary",
            "response_status",
        ]


class AdminIncidentUpdateSerializer(AdminIncidentInputSerializer):
    class Meta(AdminIncidentInputSerializer.Meta):
        fields = [*AdminIncidentInputSerializer.Meta.fields, "status"]


class AdminIncidentListSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    leak_item_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Incident
        fields = ["id", "company_name", "notified_at", "leak_item_count", "status", "response_status"]


class AdminLeakItemSerializer(serializers.ModelSerializer):
    selected_by_users = serializers.SerializerMethodField()

    class Meta:
        model = IncidentLeakItem
        fields = ["id", "label", "is_leaked", "leak_type", "selected_by_users"]

    def get_selected_by_users(self, item: IncidentLeakItem) -> bool:
        return item.selection_count > 0


class AdminIncidentSerializer(serializers.ModelSerializer):
    company_id = serializers.IntegerField(read_only=True)
    leak_items = AdminLeakItemSerializer(many=True, read_only=True)

    class Meta:
        model = Incident
        fields = [
            "id",
            "company_id",
            "occurred_at",
            "notified_at",
            "affected_count",
            "source_url",
            "contact_info",
            "summary",
            "status",
            "response_status",
            "notice_revised_at",
            "leak_items",
        ]


class LeakItemInputSerializer(serializers.ModelSerializer):
    class Meta:
        model = IncidentLeakItem
        fields = ["label", "is_leaked", "leak_type"]
