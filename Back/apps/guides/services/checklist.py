from dataclasses import dataclass

from django.db.models import Model, Q
from django.http import Http404

from apps.guides.constants import URGENT_PRIORITY_MAX, Answer, Certainty, PublishStatus, SurveyKey, TriggerType
from apps.guides.models import Action, ActionCompletion, SurveyResponse
from apps.incidents.constants import LeakType
from apps.incidents.services import get_public_incidents, with_company_and_leak_items
from common.queries import get_owned_or_404

SURVEY_FIELD_KEYS = {
    "payment_linked": SurveyKey.PAYMENT_LINKED,
    "reused_password": SurveyKey.REUSED_PASSWORD,
    "impersonation_contact": SurveyKey.IMPERSONATION_CONTACT,
    "damage_occurred": SurveyKey.DAMAGE_OCCURRED,
}
SURVEY_CERTAINTY = {Answer.YES: Certainty.CERTAIN, Answer.UNKNOWN: Certainty.CHECK_NEEDED}
SPECIAL_REASON = "이 사고 안내"


@dataclass(frozen=True)
class ChecklistItem:
    action: Action
    reason: str
    certainty: str
    is_new: bool
    completed: bool


@dataclass(frozen=True)
class Checklist:
    incident: Model
    response: SurveyResponse
    items: tuple[ChecklistItem, ...]
    notice_revised: bool

    @property
    def total_count(self) -> int:
        return len(self.items)

    @property
    def completed_count(self) -> int:
        return sum(item.completed for item in self.items)


def get_response_or_404(user: Model, incident: Model) -> SurveyResponse:
    return get_owned_or_404(SurveyResponse.objects.prefetch_related("selected_items"), user, incident=incident)


def _leak_type_certainty(incident: Model, response: SurveyResponse) -> dict[str, str]:
    # 모름 → 지금 유출 항목 전체 유형, 확인 필요
    if response.leak_items_unknown:
        return {item.leak_type: Certainty.CHECK_NEEDED for item in incident.leak_items.all() if item.is_leaked}
    return {item.leak_type: Certainty.CERTAIN for item in response.selected_items.all()}


def _survey_certainty(response: SurveyResponse) -> dict[str, str]:
    return {
        key: SURVEY_CERTAINTY[getattr(response, field)]
        for field, key in SURVEY_FIELD_KEYS.items()
        if getattr(response, field) in SURVEY_CERTAINTY
    }


# 공개 조치 + (공통 또는 이 사고 특수)만 (다른 사고 특수 조치 노출 X)
def available_actions(incident: Model) -> Q:
    return Q(status=PublishStatus.PUBLIC) & (Q(incident__isnull=True) | Q(incident=incident))


def _reason_and_certainty(action: Action, types: dict[str, str], surveys: dict[str, str]) -> tuple[str, str]:
    if action.trigger_type == TriggerType.LEAK_TYPE:
        return f"유출 항목: {LeakType(action.leak_type).label}", types[action.leak_type]
    if action.trigger_type == TriggerType.SURVEY:
        return f"설문: {SurveyKey(action.survey_key).label}", surveys[action.survey_key]
    return SPECIAL_REASON, Certainty.CERTAIN


# 저장 X, 요청마다 계산 (docs/erd.md 체크리스트 계산 규칙)
def build_checklist(user: Model, incident: Model, response: SurveyResponse) -> Checklist:
    types = _leak_type_certainty(incident, response)
    surveys = _survey_certainty(response)
    trigger = (
        Q(trigger_type=TriggerType.LEAK_TYPE, leak_type__in=types)
        | Q(trigger_type=TriggerType.SURVEY, survey_key__in=surveys)
        | Q(trigger_type=TriggerType.ALWAYS, incident=incident)
    )
    actions = list(Action.objects.filter(available_actions(incident) & trigger))
    completed = set(
        ActionCompletion.objects.filter(user=user, incident=incident, action__in=actions).values_list(
            "action_id", flat=True
        )
    )
    items = []
    for action in actions:
        reason, certainty = _reason_and_certainty(action, types, surveys)
        is_new = action.published_at is not None and action.published_at > response.updated_at
        items.append(ChecklistItem(action, reason, certainty, is_new, action.pk in completed))
    items.sort(key=lambda item: (item.action.priority, item.certainty != Certainty.CERTAIN, item.action.pk))
    revised_at = incident.notice_revised_at
    return Checklist(incident, response, tuple(items), revised_at is not None and revised_at > response.updated_at)


# 설문 없이 완료 X (PV), 공개 + 공통 또는 이 사고 특수만
def get_completable_action_or_404(user: Model, incident: Model, action_id: int) -> Action:
    get_response_or_404(user, incident)
    action = Action.objects.filter(available_actions(incident), pk=action_id).first()
    if action is None:
        raise Http404
    return action


def get_progress(user: Model) -> list[dict[str, object]]:
    incidents = with_company_and_leak_items(get_public_incidents().filter(survey_responses__user=user))
    responses = {
        response.incident_id: response
        for response in SurveyResponse.objects.filter(user=user).prefetch_related("selected_items")
    }
    progress = []
    for incident in incidents:
        checklist = build_checklist(user, incident, responses[incident.pk])
        urgent = [
            item for item in checklist.items if item.action.priority <= URGENT_PRIORITY_MAX and not item.completed
        ]
        progress.append(
            {
                "incident_id": incident.pk,
                "company_name": incident.company.name,
                "completed_count": checklist.completed_count,
                "total_count": checklist.total_count,
                "urgent_remaining": len(urgent),
                "next_urgent_title": urgent[0].action.title if urgent else None,
            }
        )
    return progress
