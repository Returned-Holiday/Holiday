from rest_framework import serializers

from apps.incidents.constants import SEARCH_QUERY_MAX_LENGTH
from apps.incidents.models import Incident, IncidentLeakItem


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
            "leak_items",
        ]
