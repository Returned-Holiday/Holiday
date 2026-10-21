from datetime import date

from apps.accounts.models import User
from apps.guides.constants import Answer, PublishStatus, TriggerType
from apps.guides.models import Action
from apps.incidents.constants import IncidentStatus, LeakType
from apps.incidents.models import Company, Incident, IncidentLeakItem


def make_user(email: str = "member@example.com") -> User:
    return User.objects.create_user(email=email, nickname=email.split("@")[0][:20])


def make_incident(name: str = "에이사", status: str = IncidentStatus.PUBLIC) -> Incident:
    company = Company.objects.create(name=name)
    return Incident.objects.create(
        company=company,
        notified_at=date(2026, 10, 1),
        summary="요약",
        source_url="https://example.com/notice",
        contact_info="고객센터",
        status=status,
    )


def make_item(incident: Incident, leak_type: str = LeakType.CONTACT, is_leaked: bool = True) -> IncidentLeakItem:
    return IncidentLeakItem.objects.create(incident=incident, leak_type=leak_type, label="항목", is_leaked=is_leaked)


def make_action(title: str, priority: int, **fields: object) -> Action:
    fields.setdefault("trigger_type", TriggerType.LEAK_TYPE)
    fields.setdefault("status", PublishStatus.PUBLIC)
    return Action.objects.create(title=title, priority=priority, steps="단계", **fields)


def survey_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "leak_items_answer": "NONE",
        "selected_item_ids": [],
        "payment_linked": Answer.NO,
        "reused_password": Answer.NO,
        "impersonation_contact": Answer.NO,
        "damage_occurred": Answer.NO,
    }
    payload.update(overrides)
    return payload
