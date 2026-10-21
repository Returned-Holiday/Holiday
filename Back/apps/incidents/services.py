from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.db.models import Count, Prefetch, ProtectedError, QuerySet, RestrictedError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers

from apps.incidents.constants import IncidentStatus
from apps.incidents.exceptions import CompanyKeyConflict, LeakItemInUse
from apps.incidents.models import Company, Incident, IncidentLeakItem
from apps.incidents.validators import normalize_company_key

COMPANY_CONFLICT_CODES = frozenset({"conflict", "unique"})


# 사용자 화면 사고 조회는 여기로만 (비공개 노출 X)
def get_public_incidents() -> QuerySet[Incident]:
    return Incident.objects.filter(status=IncidentStatus.PUBLIC)


# 관리자 검수용 (공개 여부 무관)
def incident_exists(incident_id: int) -> bool:
    return Incident.objects.filter(pk=incident_id).exists()


# 비공개·없음 모두 404 (존재 여부 숨김)
def get_public_incident_or_404(incident_id: int) -> Incident:
    return get_object_or_404(get_public_incidents(), pk=incident_id)


def with_company_and_leak_items(incidents: QuerySet[Incident]) -> QuerySet[Incident]:
    return incidents.select_related("company").prefetch_related(
        Prefetch("leak_items", queryset=IncidentLeakItem.objects.order_by("id"))
    )


# 대응 중 인원 = 설문 응답 수 (역참조 집계, guides import X)
def with_active_count(incidents: QuerySet[Incident]) -> QuerySet[Incident]:
    return incidents.annotate(active_count=Count("survey_responses"))


# 사용자가 고른 항목 표시 (삭제 불가 미리 안내)
def with_admin_leak_items(incidents: QuerySet[Incident]) -> QuerySet[Incident]:
    leak_items = IncidentLeakItem.objects.annotate(selection_count=Count("survey_responses")).order_by("id")
    return incidents.select_related("company").prefetch_related(Prefetch("leak_items", queryset=leak_items))


# 기업 수 적음 → 파이썬 비교 (공백·대소문자 무시, DB별 JSON 검색 차이 X)
def _matching_company_ids(key: str) -> list[int]:
    return [
        company_id
        for company_id, name, aliases in Company.objects.values_list("id", "name", "aliases")
        if key in normalize_company_key(name) or any(key in normalize_company_key(alias) for alias in aliases)
    ]


def filter_by_company_query(incidents: QuerySet[Incident], query: str) -> QuerySet[Incident]:
    key = normalize_company_key(query)
    if key:
        incidents = incidents.filter(company_id__in=_matching_company_ids(key))
    return incidents


def search_public_incidents(query: str) -> QuerySet[Incident]:
    return filter_by_company_query(get_public_incidents(), query)


# 별칭 중복 검사 → 저장을 기업 행 잠금 안에서 (TOCTOU), ModelSerializer는 clean() 안 부름 → 여기로만 저장
def save_company(company: Company) -> Company:
    with transaction.atomic():
        list(Company.objects.select_for_update().order_by("pk").values_list("pk", flat=True))
        company.full_clean()
        company.save()
    return company


# 모델 검증 오류 → API 오류 (중복 409, 나머지 400)
def save_company_for_api(company: Company) -> Company:
    try:
        return save_company(company)
    except IntegrityError as error:
        # 이름 유일 제약 (동시 등록)
        raise CompanyKeyConflict from error
    except DjangoValidationError as error:
        codes = {item.code for items in error.error_dict.values() for item in items}
        if codes & COMPANY_CONFLICT_CODES:
            raise CompanyKeyConflict from error
        raise serializers.ValidationError(error.message_dict) from error


def _mark_notice_revised(incident_id: int) -> None:
    now = timezone.now()
    Incident.objects.filter(pk=incident_id).update(notice_revised_at=now, updated_at=now)


# 유출 항목 변경 + 공지 갱신 시각 → 한 트랜잭션
def add_leak_item(incident: Incident, data: dict[str, object]) -> IncidentLeakItem:
    with transaction.atomic():
        item = IncidentLeakItem.objects.create(incident=incident, **data)
        _mark_notice_revised(incident.pk)
    return item


def update_leak_item(item: IncidentLeakItem, data: dict[str, object]) -> IncidentLeakItem:
    if not data:
        return item
    with transaction.atomic():
        for field, value in data.items():
            setattr(item, field, value)
        item.save(update_fields=list(data))
        _mark_notice_revised(item.incident_id)
    return item


def delete_leak_item(item: IncidentLeakItem) -> None:
    try:
        with transaction.atomic():
            item.delete()
            _mark_notice_revised(item.incident_id)
    except (ProtectedError, RestrictedError) as error:
        raise LeakItemInUse from error


# OCR 매칭: 기업명·별칭이 텍스트에 포함된 기업의 최신 공개 사고 + 그 사고 "유출" 항목 이름 포함 여부 (공백·대소문자·전각 무시)
def match_public_incident_text(text: str) -> tuple[Incident | None, list[IncidentLeakItem]]:
    key = normalize_company_key(text)
    if not key:
        return None, []
    # 기업별 가장 길게 일치한 이름·별칭 길이 ("SKT" 안의 "KT" 오탐 방지), 한 글자는 제외
    scores: dict[int, int] = {}
    for company_id, name, aliases in Company.objects.values_list("id", "name", "aliases"):
        matched = [len(term) for term in (normalize_company_key(name), *aliases) if len(term) >= 2 and term in key]
        if matched:
            scores[company_id] = max(matched)
    candidates = with_company_and_leak_items(get_public_incidents().filter(company_id__in=scores))
    # 긴 일치 우선, 동률이면 공지일 최신
    incident = min(
        candidates, key=lambda found: (-scores[found.company_id], -found.notified_at.toordinal(), -found.pk), default=None
    )
    if incident is None:
        return None, []
    items = [
        item
        for item in incident.leak_items.all()
        if item.is_leaked and normalize_company_key(item.label) and normalize_company_key(item.label) in key
    ]
    return incident, items
