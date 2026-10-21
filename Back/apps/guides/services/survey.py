from django.db import transaction
from django.db.models import Model
from django.shortcuts import get_object_or_404

from apps.guides.constants import LeakItemsAnswer
from apps.guides.models import ANSWER_FIELDS, ActionCompletion, SurveyResponse, SurveySelectedItem
from apps.incidents.services import get_public_incidents, with_company_and_leak_items


# 비공개·없음 모두 404 (공개 필터는 incidents 서비스)
def get_incident_for_user_or_404(incident_id: int) -> Model:
    return get_object_or_404(with_company_and_leak_items(get_public_incidents()), pk=incident_id)


def leaked_item_ids(incident: Model) -> frozenset[int]:
    return frozenset(item.pk for item in incident.leak_items.all() if item.is_leaked)


def find_response(user: Model, incident: Model) -> SurveyResponse | None:
    return SurveyResponse.objects.filter(user=user, incident=incident).prefetch_related("selected_items").first()


def to_answers(response: SurveyResponse) -> dict[str, object]:
    selected = sorted(item.pk for item in response.selected_items.all())
    if response.leak_items_unknown:
        leak_items_answer = LeakItemsAnswer.UNKNOWN
    elif selected:
        leak_items_answer = LeakItemsAnswer.SELECTED
    else:
        leak_items_answer = LeakItemsAnswer.NONE
    return {
        "leak_items_answer": leak_items_answer,
        "selected_item_ids": selected,
        **{field: getattr(response, field) for field in ANSWER_FIELDS},
    }


# 유일 제약 (사용자, 사고) → update_or_create로 한 행만 (TOCTOU X)
def save_survey(user: Model, incident: Model, data: dict) -> SurveyResponse:
    with transaction.atomic():
        response, _ = SurveyResponse.objects.update_or_create(
            user=user,
            incident=incident,
            defaults={
                "leak_items_unknown": data["leak_items_answer"] == LeakItemsAnswer.UNKNOWN,
                **{field: data[field] for field in ANSWER_FIELDS},
            },
        )
        SurveySelectedItem.objects.filter(survey_response=response).delete()
        SurveySelectedItem.objects.bulk_create(
            SurveySelectedItem(survey_response=response, leak_item_id=item_id)
            for item_id in data["selected_item_ids"]
        )
    return response


# 내 응답·선택 항목·그 사고 완료 기록 함께 삭제, 사고 공개 여부 무관
def delete_survey(user: Model, incident_id: int) -> bool:
    with transaction.atomic():
        responses = SurveyResponse.objects.select_for_update().filter(user=user, incident_id=incident_id)
        if not responses.exists():
            return False
        ActionCompletion.objects.filter(user=user, incident_id=incident_id).delete()
        responses.delete()
    return True
