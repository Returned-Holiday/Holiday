from django.db.models import QuerySet
from django.utils import timezone

from apps.guides.constants import PublishStatus
from apps.guides.exceptions import ActionScopeLocked
from apps.guides.models import Action

SCOPE_FIELDS = ("incident_id", "trigger_type")


def admin_actions(status: str | None, incident_id: int | None) -> QuerySet[Action]:
    actions = Action.objects.all()
    if status is not None:
        actions = actions.filter(status=status)
    if incident_id is not None:
        actions = actions.filter(incident_id=incident_id)
    return actions.order_by("-id")


# 신규는 비공개 고정 (요청 값 무시)
def create_action(data: dict) -> Action:
    return Action.objects.create(**{**data, "status": PublishStatus.PRIVATE, "published_at": None})


# 처음 공개될 때만 공개 시각 기록 (서버 시각, "새 조치" 기준)
def update_action(action: Action, data: dict) -> Action:
    changes_scope = any(field in data and data[field] != getattr(action, field) for field in SCOPE_FIELDS)
    if changes_scope and action.completions.exists():
        raise ActionScopeLocked
    for field, value in data.items():
        setattr(action, field, value)
    if action.status == PublishStatus.PUBLIC and action.published_at is None:
        action.published_at = timezone.now()
    action.save()
    return action
