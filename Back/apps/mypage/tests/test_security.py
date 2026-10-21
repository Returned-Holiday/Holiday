from django.core.cache import cache
from django.test import TestCase

from apps.guides.tests.helpers import make_incident, make_user, survey_payload
from apps.incidents.constants import IncidentStatus
from apps.incidents.models import Incident

MYPAGE_URL = "/api/mypage/"


class MypageSecurityTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.user = make_user("member@example.com")
        self.other = make_user("other@example.com")
        self.incident = make_incident()

    def answer_as(self, user: object, incident: Incident) -> None:
        self.client.force_login(user)
        self.client.put(f"/api/guides/incidents/{incident.pk}/survey/", survey_payload(),
                        content_type="application/json")

    def incident_ids(self, **params: object) -> list[int]:
        return [row["incident_id"] for row in self.client.get(MYPAGE_URL, params).json()["data"]["incidents"]]

    def test_requires_login(self) -> None:
        response = self.client.get(MYPAGE_URL)
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json()["code"], "AUTH_REQUIRED")

    def test_only_own_progress(self) -> None:
        other_incident = make_incident("비사")
        self.answer_as(self.other, other_incident)
        self.answer_as(self.user, self.incident)
        self.assertEqual(self.incident_ids(), [self.incident.pk])
        # 쿼리로 다른 사용자 지정 X
        self.assertEqual(self.incident_ids(user_id=self.other.pk, user=self.other.pk), [self.incident.pk])

    def test_private_incident_hidden(self) -> None:
        self.answer_as(self.user, self.incident)
        Incident.objects.filter(pk=self.incident.pk).update(status=IncidentStatus.PRIVATE)
        self.assertEqual(self.incident_ids(), [])

    def test_read_only(self) -> None:
        self.client.force_login(self.user)
        for method in ("post", "put", "patch", "delete", "options"):
            with self.subTest(method=method):
                self.assertEqual(getattr(self.client, method)(MYPAGE_URL).status_code, 405)
