from django.db import transaction
from django.db.models import Prefetch, QuerySet
from django.shortcuts import get_object_or_404

from apps.incidents.constants import IncidentStatus
from apps.incidents.models import Company, Incident, IncidentLeakItem
from apps.incidents.validators import normalize_company_key


# 사용자 화면 사고 조회는 여기로만 (비공개 노출 X)
def get_public_incidents() -> QuerySet[Incident]:
    return Incident.objects.filter(status=IncidentStatus.PUBLIC)


# 비공개·없음 모두 404 (존재 여부 숨김)
def get_public_incident_or_404(incident_id: int) -> Incident:
    return get_object_or_404(get_public_incidents(), pk=incident_id)


def with_company_and_leak_items(incidents: QuerySet[Incident]) -> QuerySet[Incident]:
    return incidents.select_related("company").prefetch_related(
        Prefetch("leak_items", queryset=IncidentLeakItem.objects.order_by("id"))
    )


# 기업 수 적음 → 파이썬 비교 (공백·대소문자 무시, DB별 JSON 검색 차이 X)
def _matching_company_ids(key: str) -> list[int]:
    return [
        company_id
        for company_id, name, aliases in Company.objects.values_list("id", "name", "aliases")
        if key in normalize_company_key(name) or any(key in normalize_company_key(alias) for alias in aliases)
    ]


def search_public_incidents(query: str) -> QuerySet[Incident]:
    incidents = get_public_incidents()
    key = normalize_company_key(query)
    if key:
        incidents = incidents.filter(company_id__in=_matching_company_ids(key))
    return incidents


# 별칭 중복 검사 → 저장을 기업 행 잠금 안에서 (TOCTOU), ModelSerializer는 clean() 안 부름 → 여기로만 저장
def save_company(company: Company) -> Company:
    with transaction.atomic():
        list(Company.objects.select_for_update().order_by("pk").values_list("pk", flat=True))
        company.full_clean()
        company.save()
    return company
