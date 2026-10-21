from rest_framework import serializers

from apps.incidents.services import incident_exists
from apps.reports.constants import ReportStatus
from apps.reports.models import Report
from common.validators import DB_ID_MAX, REJECT_REASON_MAX_LENGTH

UNKNOWN_INCIDENT_MESSAGE = "존재하지 않는 사고예요."


# status·reporter·검수 필드 X (서버 결정)
class ReportInputSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ["company_name", "source_url", "notified_at", "leak_items_text"]


class MyReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ["id", "company_name", "created_at", "status", "reject_reason", "reviewed_at"]


class AdminReportQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ReportStatus.choices, required=False)


# 제보자 이메일 X, 닉네임만
class AdminReportListSerializer(serializers.ModelSerializer):
    reporter_nickname = serializers.CharField(source="reporter.nickname", read_only=True)

    class Meta:
        model = Report
        fields = ["id", "company_name", "reporter_nickname", "created_at", "status"]


class AdminReportDetailSerializer(AdminReportListSerializer):
    linked_incident_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta(AdminReportListSerializer.Meta):
        fields = [
            *AdminReportListSerializer.Meta.fields,
            "source_url",
            "notified_at",
            "leak_items_text",
            "reject_reason",
            "linked_incident_id",
            "reviewed_at",
        ]


class ApproveInputSerializer(serializers.Serializer):
    incident_id = serializers.IntegerField(required=False, allow_null=True, min_value=1, max_value=DB_ID_MAX)

    def validate_incident_id(self, value: int | None) -> int | None:
        if value is not None and not incident_exists(value):
            raise serializers.ValidationError(UNKNOWN_INCIDENT_MESSAGE)
        return value


class RejectInputSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=REJECT_REASON_MAX_LENGTH)
