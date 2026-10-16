from django.db import transaction
from django.db.models import QuerySet
from django.shortcuts import get_object_or_404

from apps.incidents.constants import IncidentStatus
from apps.incidents.models import Company, Incident


# 사용자 화면 사고 조회는 여기로만 (비공개 노출 X)
def get_public_incidents() -> QuerySet[Incident]:
    return Incident.objects.filter(status=IncidentStatus.PUBLIC)


# 비공개·없음 모두 404 (존재 여부 숨김)
def get_public_incident_or_404(incident_id: int) -> Incident:
    return get_object_or_404(get_public_incidents(), pk=incident_id)


# 별칭 중복 검사 → 저장을 기업 행 잠금 안에서 (TOCTOU), ModelSerializer는 clean() 안 부름 → 여기로만 저장
def save_company(company: Company) -> Company:
    with transaction.atomic():
        list(Company.objects.select_for_update().order_by("pk").values_list("pk", flat=True))
        company.full_clean()
        company.save()
    return company
