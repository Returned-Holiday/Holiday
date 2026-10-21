from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.guides.constants import Answer, PublishStatus, SurveyKey, TriggerType
from apps.guides.models import ActionCompletion, SurveyResponse
from apps.guides.services.checklist import get_progress
from apps.guides.tests.helpers import make_action, make_incident, make_item, make_user, survey_payload
from apps.incidents.constants import LeakType


def survey_url(incident_id: int) -> str:
    return f"/api/guides/incidents/{incident_id}/survey/"


def checklist_url(incident_id: int) -> str:
    return f"/api/guides/incidents/{incident_id}/checklist/"


def completion_url(incident_id: int, action_id: int) -> str:
    return f"/api/guides/incidents/{incident_id}/completions/{action_id}/"


class SurveyApiTests(APITestCase):
    def setUp(self) -> None:
        self.user = make_user()
        self.client.force_login(self.user)
        self.incident = make_incident()
        self.item = make_item(self.incident)

    def test_empty_then_saved(self) -> None:
        self.assertEqual(self.client.get(survey_url(self.incident.pk)).json(), {"data": None})
        payload = survey_payload(leak_items_answer="SELECTED", selected_item_ids=[self.item.pk], payment_linked="YES")
        response = self.client.put(survey_url(self.incident.pk), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.client.get(survey_url(self.incident.pk)).json()["data"], payload)

    def test_resubmit_updates_same_row(self) -> None:
        self.client.put(survey_url(self.incident.pk), survey_payload(), format="json")
        self.client.put(survey_url(self.incident.pk), survey_payload(leak_items_answer="UNKNOWN"), format="json")
        self.assertEqual(SurveyResponse.objects.count(), 1)
        self.assertEqual(self.client.get(survey_url(self.incident.pk)).json()["data"]["leak_items_answer"], "UNKNOWN")

    def test_delete_removes_completions(self) -> None:
        action = make_action("공통", 5, leak_type=LeakType.CONTACT)
        self.client.put(survey_url(self.incident.pk), survey_payload(leak_items_answer="UNKNOWN"), format="json")
        self.client.put(completion_url(self.incident.pk, action.pk))
        self.assertEqual(self.client.delete(survey_url(self.incident.pk)).status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(SurveyResponse.objects.exists())
        self.assertFalse(ActionCompletion.objects.exists())
        self.assertEqual(self.client.delete(survey_url(self.incident.pk)).status_code, status.HTTP_404_NOT_FOUND)


class ChecklistApiTests(APITestCase):
    def setUp(self) -> None:
        self.user = make_user()
        self.client.force_login(self.user)
        self.incident = make_incident()
        self.contact = make_item(self.incident, LeakType.CONTACT)
        make_item(self.incident, LeakType.AUTH_FACTOR, is_leaked=False)
        # docs/erd.md 체크리스트 예시 표
        self.card = make_action("카드 확인", 1, trigger_type=TriggerType.SURVEY, survey_key=SurveyKey.PAYMENT_LINKED)
        make_action("유심 보호", 2, leak_type=LeakType.AUTH_FACTOR)
        make_action("사칭 대응", 3, trigger_type=TriggerType.SURVEY, survey_key=SurveyKey.IMPERSONATION_CONTACT)
        self.special = make_action("A사 보상", 3, trigger_type=TriggerType.ALWAYS, incident=self.incident)
        self.password = make_action("비밀번호 변경", 4, trigger_type=TriggerType.SURVEY, survey_key=SurveyKey.REUSED_PASSWORD)
        self.smishing = make_action("스미싱 주의", 5, leak_type=LeakType.CONTACT)

    def answer(self, **overrides: object) -> None:
        payload = survey_payload(
            leak_items_answer="SELECTED",
            selected_item_ids=[self.contact.pk],
            payment_linked=Answer.YES,
            reused_password=Answer.YES,
        )
        payload.update(overrides)
        self.client.put(survey_url(self.incident.pk), payload, format="json")

    def checklist(self) -> dict:
        return self.client.get(checklist_url(self.incident.pk)).json()["data"]

    def test_erd_example(self) -> None:
        self.answer()
        data = self.checklist()
        self.assertEqual([a["title"] for a in data["actions"]], ["카드 확인", "A사 보상", "비밀번호 변경", "스미싱 주의"])
        self.assertEqual(
            [a["reason"] for a in data["actions"]],
            ["설문: 결제수단 연결", "이 사고 안내", "설문: 비밀번호 재사용", "유출 항목: 연락처"],
        )
        self.assertTrue(all(a["certainty"] == "CERTAIN" and a["summary"] is None for a in data["actions"]))
        self.assertEqual((data["completed_count"], data["total_count"]), (0, 4))
        self.assertEqual(data["company_name"], "에이사")

    def test_unknown_answers_need_check_and_sort_after_certain(self) -> None:
        self.answer(leak_items_answer="UNKNOWN", selected_item_ids=[], payment_linked=Answer.UNKNOWN)
        actions = {a["title"]: a for a in self.checklist()["actions"]}
        self.assertEqual(actions["카드 확인"]["certainty"], "CHECK_NEEDED")
        self.assertEqual(actions["스미싱 주의"]["certainty"], "CHECK_NEEDED")
        # 미유출 항목 유형은 모름이어도 제외
        self.assertNotIn("유심 보호", actions)

    def test_completion_and_progress(self) -> None:
        self.answer()
        self.assertEqual(self.client.put(completion_url(self.incident.pk, self.card.pk)).status_code, 204)
        self.assertEqual(self.client.put(completion_url(self.incident.pk, self.card.pk)).status_code, 204)
        data = self.checklist()
        self.assertEqual(data["completed_count"], 1)
        progress = get_progress(self.user)
        self.assertEqual(progress[0]["completed_count"], 1)
        self.assertEqual(progress[0]["urgent_remaining"], 1)
        self.assertEqual(progress[0]["next_urgent_title"], "A사 보상")
        self.assertEqual(self.client.delete(completion_url(self.incident.pk, self.card.pk)).status_code, 204)
        self.assertEqual(self.checklist()["completed_count"], 0)

    def test_new_action_and_notice_revised_flags(self) -> None:
        self.answer()
        later = timezone.now() + timedelta(minutes=1)
        self.smishing.published_at = later
        self.smishing.save()
        self.incident.notice_revised_at = later
        self.incident.save()
        data = self.checklist()
        self.assertTrue(data["notice_revised"])
        self.assertEqual([a["is_new"] for a in data["actions"] if a["title"] == "스미싱 주의"], [True])

    def test_private_and_other_incident_actions_excluded(self) -> None:
        make_action("비공개", 1, leak_type=LeakType.CONTACT, status=PublishStatus.PRIVATE)
        other = make_incident("다른사")
        make_action("다른 사고 특수", 1, trigger_type=TriggerType.ALWAYS, incident=other)
        make_action("다른 사고 유형", 1, leak_type=LeakType.CONTACT, incident=other)
        self.answer()
        titles = [a["title"] for a in self.checklist()["actions"]]
        for excluded in ("비공개", "다른 사고 특수", "다른 사고 유형"):
            self.assertNotIn(excluded, titles)
