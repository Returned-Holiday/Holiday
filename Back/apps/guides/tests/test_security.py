from datetime import date

from django.db import IntegrityError, transaction
from django.db.models import RestrictedError
from django.test import TestCase
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.guides.constants import Answer, PublishStatus, SurveyKey, TriggerType
from apps.guides.models import Action, ActionCompletion, SurveyResponse, SurveySelectedItem
from apps.guides.tests import helpers
from apps.incidents.constants import IncidentStatus, LeakType
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


class SurveyInputSecurityTests(APITestCase):
    def setUp(self) -> None:
        self.user = helpers.make_user()
        self.client.force_login(self.user)
        self.incident = helpers.make_incident()
        self.leaked = helpers.make_item(self.incident)
        self.not_leaked = helpers.make_item(self.incident, is_leaked=False)
        self.other_item = helpers.make_item(helpers.make_incident("다른사"))

    def put(self, **overrides: object) -> Response:
        url = f"/api/guides/incidents/{self.incident.pk}/survey/"
        return self.client.put(url, helpers.survey_payload(**overrides), format="json")

    def test_rejects_items_outside_incident_leaks(self) -> None:
        for ids in ([self.other_item.pk], [self.not_leaked.pk], [self.leaked.pk, self.leaked.pk], []):
            with self.subTest(ids=ids):
                response = self.put(leak_items_answer="SELECTED", selected_item_ids=ids)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn("selected_item_ids", response.json()["fields"])
        self.assertFalse(SurveyResponse.objects.exists())

    def test_rejects_items_with_unknown_or_none(self) -> None:
        for answer in ("UNKNOWN", "NONE"):
            with self.subTest(answer=answer):
                response = self.put(leak_items_answer=answer, selected_item_ids=[self.leaked.pk])
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_choice_error_has_no_input_echo(self) -> None:
        response = self.put(payment_linked="<script>MAYBE")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn(b"MAYBE", response.content)

    def test_rejects_oversized_list(self) -> None:
        response = self.put(leak_items_answer="SELECTED", selected_item_ids=list(range(1, 52)))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_private_incident_not_found(self) -> None:
        private = helpers.make_incident("비공개사", status=IncidentStatus.PRIVATE)
        for method in ("get", "put"):
            with self.subTest(method=method):
                url = f"/api/guides/incidents/{private.pk}/survey/"
                response = getattr(self.client, method)(url, helpers.survey_payload(), format="json")
                self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(f"/api/guides/incidents/{private.pk}/checklist/").status_code, 404)

    def test_requires_login(self) -> None:
        self.client.logout()
        self.assertEqual(self.client.get(f"/api/guides/incidents/{self.incident.pk}/survey/").status_code, 401)


class OwnershipSecurityTests(APITestCase):
    def setUp(self) -> None:
        self.owner = helpers.make_user("owner@example.com")
        self.other = helpers.make_user("other@example.com")
        self.incident = helpers.make_incident()
        self.action = helpers.make_action("공통", 5, leak_type=LeakType.CONTACT)
        self.client.force_login(self.owner)
        self.client.put(
            f"/api/guides/incidents/{self.incident.pk}/survey/",
            helpers.survey_payload(leak_items_answer="UNKNOWN"),
            format="json",
        )
        self.client.put(f"/api/guides/incidents/{self.incident.pk}/completions/{self.action.pk}/")
        self.client.force_login(self.other)

    def test_other_user_sees_nothing(self) -> None:
        self.assertEqual(self.client.get(f"/api/guides/incidents/{self.incident.pk}/survey/").json(), {"data": None})
        self.assertEqual(self.client.get(f"/api/guides/incidents/{self.incident.pk}/checklist/").status_code, 404)

    def test_other_user_cannot_delete(self) -> None:
        self.assertEqual(self.client.delete(f"/api/guides/incidents/{self.incident.pk}/survey/").status_code, 404)
        self.assertEqual(SurveyResponse.objects.filter(user=self.owner).count(), 1)
        self.assertEqual(ActionCompletion.objects.filter(user=self.owner).count(), 1)


class CompletionSecurityTests(APITestCase):
    def setUp(self) -> None:
        self.user = helpers.make_user()
        self.client.force_login(self.user)
        self.incident = helpers.make_incident()
        self.other = helpers.make_incident("다른사")
        self.common = helpers.make_action("공통", 5, leak_type=LeakType.CONTACT)

    def url(self, action_id: int) -> str:
        return f"/api/guides/incidents/{self.incident.pk}/completions/{action_id}/"

    def answer(self) -> None:
        self.client.put(
            f"/api/guides/incidents/{self.incident.pk}/survey/",
            helpers.survey_payload(leak_items_answer="UNKNOWN"),
            format="json",
        )

    def test_requires_survey(self) -> None:
        self.assertEqual(self.client.put(self.url(self.common.pk)).status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(ActionCompletion.objects.exists())

    def test_rejects_other_incident_special_and_private_actions(self) -> None:
        self.answer()
        special = helpers.make_action("다른 사고 특수", 1, trigger_type=TriggerType.ALWAYS, incident=self.other)
        private = helpers.make_action("비공개", 1, leak_type=LeakType.CONTACT, status=PublishStatus.PRIVATE)
        for action in (special, private):
            with self.subTest(action=action.title):
                self.assertEqual(self.client.put(self.url(action.pk)).status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(ActionCompletion.objects.exists())

    def test_requires_csrf(self) -> None:
        self.answer()
        client = self.client_class(enforce_csrf_checks=True)
        client.force_login(self.user)
        self.assertEqual(client.put(self.url(self.common.pk)).status_code, status.HTTP_403_FORBIDDEN)
