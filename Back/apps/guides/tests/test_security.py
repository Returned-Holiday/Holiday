from datetime import date

from django.db import IntegrityError, transaction
from django.db.models import RestrictedError
from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.guides.constants import Answer, PublishStatus, SurveyKey, TriggerType
from apps.guides.models import Action, ActionCompletion, SurveyResponse, SurveySelectedItem
from apps.incidents.constants import LeakType
from apps.incidents.models import Company, Incident, IncidentLeakItem


def make_incident() -> Incident:
    company = Company.objects.create(name="테스트기업")
    return Incident.objects.create(
        company=company,
        notified_at=date(2026, 10, 1),
        summary="요약",
        source_url="https://example.com/notice",
    )


def make_response(user: User, incident: Incident) -> SurveyResponse:
    return SurveyResponse.objects.create(
        user=user,
        incident=incident,
        payment_linked=Answer.YES,
        reused_password=Answer.NO,
        impersonation_contact=Answer.UNKNOWN,
        damage_occurred=Answer.NO,
    )


def action_fields(**overrides: object) -> dict[str, object]:
    fields: dict[str, object] = {
        "trigger_type": TriggerType.LEAK_TYPE,
        "leak_type": LeakType.CONTACT,
        "priority": 5,
        "title": "스미싱 주의",
        "steps": "모르는 링크를 누르지 않는다",
    }
    fields.update(overrides)
    return fields


class ActionConstraintTests(TestCase):
    def setUp(self) -> None:
        self.incident = make_incident()

    def assert_rejected(self, **overrides: object) -> None:
        with self.assertRaises(IntegrityError), transaction.atomic():
            Action.objects.create(**action_fields(**overrides))

    def test_valid_triggers(self) -> None:
        Action.objects.create(**action_fields())
        Action.objects.create(**action_fields(trigger_type=TriggerType.SURVEY, leak_type=None, survey_key=SurveyKey.PAYMENT_LINKED))
        Action.objects.create(**action_fields(trigger_type=TriggerType.ALWAYS, leak_type=None, incident=self.incident))
        self.assertEqual(Action.objects.filter(status=PublishStatus.PRIVATE).count(), 3)

    def test_trigger_requires_matching_field(self) -> None:
        self.assert_rejected(leak_type=None)
        self.assert_rejected(survey_key=SurveyKey.PAYMENT_LINKED)
        self.assert_rejected(trigger_type=TriggerType.SURVEY)
        self.assert_rejected(trigger_type=TriggerType.SURVEY, leak_type=None)
        # 항상 트리거는 특수 조치 전용
        self.assert_rejected(trigger_type=TriggerType.ALWAYS, leak_type=None)

    def test_public_requires_published_at(self) -> None:
        self.assert_rejected(status=PublishStatus.PUBLIC)
        Action.objects.create(**action_fields(status=PublishStatus.PUBLIC, published_at=timezone.now()))

    def test_rejects_invalid_values(self) -> None:
        for overrides in ({"priority": 0}, {"priority": 6}, {"status": "DRAFT"}, {"leak_type": "UNKNOWN_TYPE"}):
            with self.subTest(overrides=overrides):
                self.assert_rejected(**overrides)


class SurveyConstraintTests(TestCase):
    def setUp(self) -> None:
        self.user = User.objects.create_user(email="member@example.com", nickname="member")
        self.incident = make_incident()

    def test_one_response_per_user_and_incident(self) -> None:
        make_response(self.user, self.incident)
        with self.assertRaises(IntegrityError), transaction.atomic():
            make_response(self.user, self.incident)

    def test_rejects_invalid_answer(self) -> None:
        with self.assertRaises(IntegrityError), transaction.atomic():
            SurveyResponse.objects.create(
                user=self.user,
                incident=self.incident,
                payment_linked="MAYBE",
                reused_password=Answer.NO,
                impersonation_contact=Answer.NO,
                damage_occurred=Answer.NO,
            )


class DeletePolicyTests(TestCase):
    def setUp(self) -> None:
        self.user = User.objects.create_user(email="member@example.com", nickname="member")
        self.incident = make_incident()
        self.item = IncidentLeakItem.objects.create(
            incident=self.incident, leak_type=LeakType.CONTACT, label="휴대전화번호", is_leaked=True
        )
        self.response = make_response(self.user, self.incident)
        SurveySelectedItem.objects.create(survey_response=self.response, leak_item=self.item)
        self.action = Action.objects.create(**action_fields())
        ActionCompletion.objects.create(user=self.user, incident=self.incident, action=self.action)

    def test_withdraw_removes_personal_records(self) -> None:
        self.user.delete()
        self.assertFalse(SurveyResponse.objects.exists())
        self.assertFalse(SurveySelectedItem.objects.exists())
        self.assertFalse(ActionCompletion.objects.exists())
        # 공식 정보는 유지
        self.assertTrue(Action.objects.exists())
        self.assertTrue(IncidentLeakItem.objects.exists())

    def test_selected_leak_item_not_deleted(self) -> None:
        with self.assertRaises(RestrictedError):
            self.item.delete()

    def test_incident_with_user_records_not_deleted(self) -> None:
        with self.assertRaises(RestrictedError):
            self.incident.delete()

    def test_completed_action_not_deleted(self) -> None:
        with self.assertRaises(RestrictedError):
            self.action.delete()
