from django.core.cache import cache
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APITestCase

from apps.guides.models import ActionCompletion, SurveyResponse
from apps.guides.tests import helpers
from apps.incidents.constants import IncidentStatus, LeakType
from apps.incidents.models import Incident
from common.validators import DB_ID_MAX

SENSITIVE_LIMIT = 5
ID_OVER_LIMIT = DB_ID_MAX + 1


# BE-B 보안 리뷰 보강 (기본 케이스는 test_security.py)
class GuidesSecurityReviewTests(APITestCase):
    def setUp(self) -> None:
        cache.clear()
        self.user = helpers.make_user("member@example.com")
        self.other = helpers.make_user("other@example.com")
        self.incident = helpers.make_incident()
        self.item = helpers.make_item(self.incident, LeakType.CONTACT)
        self.action = helpers.make_action("공통 조치", 1, leak_type=LeakType.CONTACT)
        self.client.force_login(self.user)

    def survey_url(self, incident: Incident | None = None) -> str:
        return f"/api/guides/incidents/{(incident or self.incident).pk}/survey/"

    def completion_url(self, action_id: int | None = None) -> str:
        return f"/api/guides/incidents/{self.incident.pk}/completions/{action_id or self.action.pk}/"

    def answer(self, **overrides: object) -> Response:
        payload = helpers.survey_payload(leak_items_answer="SELECTED", selected_item_ids=[self.item.pk])
        payload.update(overrides)
        return self.client.put(self.survey_url(), payload, format="json")

    def test_survey_delete_limited(self) -> None:
        for _ in range(SENSITIVE_LIMIT):
            self.answer()
            self.assertEqual(self.client.delete(self.survey_url()).status_code, status.HTTP_204_NO_CONTENT)
        self.answer()
        response = self.client.delete(self.survey_url())
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertTrue(SurveyResponse.objects.filter(user=self.user).exists())

    def test_server_fields_not_client_controlled(self) -> None:
        response = self.answer(user=self.other.pk, user_id=self.other.pk, incident=999, leak_items_unknown=True)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        saved = SurveyResponse.objects.get()
        self.assertEqual((saved.user, saved.incident), (self.user, self.incident))
        # 1번 답은 leak_items_answer로만 결정
        self.assertFalse(saved.leak_items_unknown)

    def test_uncomplete_keeps_other_users_record(self) -> None:
        for user in (self.other, self.user):
            self.client.force_login(user)
            self.answer()
            self.client.put(self.completion_url())
        self.assertEqual(self.client.delete(self.completion_url()).status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(list(ActionCompletion.objects.values_list("user", flat=True)), [self.other.pk])

    def test_incident_turned_private(self) -> None:
        self.answer()
        Incident.objects.filter(pk=self.incident.pk).update(status=IncidentStatus.PRIVATE)
        checklist = self.client.get(f"/api/guides/incidents/{self.incident.pk}/checklist/")
        self.assertEqual(checklist.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.put(self.completion_url()).status_code, status.HTTP_404_NOT_FOUND)
        # 내 기록 삭제는 공개 여부 무관 (docs/api.md)
        self.assertEqual(self.client.delete(self.survey_url()).status_code, status.HTTP_204_NO_CONTENT)

    def test_huge_ids_rejected_without_server_error(self) -> None:
        response = self.answer(selected_item_ids=[ID_OVER_LIMIT])
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.answer()
        self.assertEqual(self.client.put(self.completion_url(ID_OVER_LIMIT)).status_code, status.HTTP_404_NOT_FOUND)
        huge_incident = f"/api/guides/incidents/{ID_OVER_LIMIT}/checklist/"
        self.assertEqual(self.client.get(huge_incident).status_code, status.HTTP_404_NOT_FOUND)

    def test_response_fields_fixed(self) -> None:
        self.answer()
        survey = self.client.get(self.survey_url()).json()["data"]
        self.assertEqual(set(survey), {"leak_items_answer", "selected_item_ids", "payment_linked", "reused_password",
                                       "impersonation_contact", "damage_occurred"})
        checklist = self.client.get(f"/api/guides/incidents/{self.incident.pk}/checklist/").json()["data"]
        self.assertEqual(set(checklist), {"incident_id", "company_name", "source_url", "contact_info", "notice_revised",
                                          "leak_items_unknown", "completed_count", "total_count", "actions"})
        self.assertEqual(set(checklist["actions"][0]), {"id", "priority", "title", "summary", "steps", "source_url",
                                                        "reason", "certainty", "is_new", "completed"})
