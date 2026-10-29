import datetime

from django.core.cache import cache
from django.test import TestCase

from apps.guides.tests.helpers import make_action, make_incident, make_item, make_user, survey_payload
from apps.incidents.constants import LeakType
from apps.incidents.models import Incident

MYPAGE_URL = "/api/mypage/"


class MypageApiTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.user = make_user()
        self.client.force_login(self.user)

    def answer_survey(self, incident: Incident, **overrides: object) -> None:
        response = self.client.put(f"/api/guides/incidents/{incident.pk}/survey/", survey_payload(**overrides),
                                   content_type="application/json")
        self.assertEqual(response.status_code, 204)

    def incidents(self) -> list[dict]:
        response = self.client.get(MYPAGE_URL)
        self.assertEqual(response.status_code, 200)
        return response.json()["data"]["incidents"]

    def test_empty_without_survey(self) -> None:
        make_incident()
        self.assertEqual(self.incidents(), [])

    def test_progress_and_urgent_action(self) -> None:
        incident = make_incident()
        item = make_item(incident, LeakType.CONTACT)
        urgent = make_action("스미싱 문자 차단", 1, leak_type=LeakType.CONTACT)
        make_action("비밀번호 점검", 4, leak_type=LeakType.CONTACT)
        self.answer_survey(incident, leak_items_answer="SELECTED", selected_item_ids=[item.pk])

        [row] = self.incidents()
        self.assertEqual(set(row), {"incident_id", "company_name", "completed_count", "total_count",
                                    "urgent_remaining", "next_urgent_title"})
        self.assertEqual((row["incident_id"], row["company_name"]), (incident.pk, "에이사"))
        self.assertEqual((row["completed_count"], row["total_count"]), (0, 2))
        self.assertEqual((row["urgent_remaining"], row["next_urgent_title"]), (1, "스미싱 문자 차단"))

        self.client.put(f"/api/guides/incidents/{incident.pk}/completions/{urgent.pk}/")
        [row] = self.incidents()
        self.assertEqual((row["completed_count"], row["urgent_remaining"], row["next_urgent_title"]), (1, 0, None))

    def test_newest_notice_first(self) -> None:
        old = make_incident("옛사")
        new = make_incident("새사")
        Incident.objects.filter(pk=old.pk).update(notified_at=datetime.date(2026, 1, 1))
        for incident in (old, new):
            self.answer_survey(incident)
        self.assertEqual([row["incident_id"] for row in self.incidents()], [new.pk, old.pk])
