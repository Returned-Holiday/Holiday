from rest_framework import serializers


# 필드 직접 나열 (계산 함수에 내부 값이 늘어도 응답 X)
class MyIncidentProgressSerializer(serializers.Serializer):
    incident_id = serializers.IntegerField()
    company_name = serializers.CharField()
    completed_count = serializers.IntegerField()
    total_count = serializers.IntegerField()
    urgent_remaining = serializers.IntegerField()
    next_urgent_title = serializers.CharField(allow_null=True)
