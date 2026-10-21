import datetime

from django.core.cache import cache
from django.test import TestCase

from apps.accounts.models import User
from apps.guides.constants import Answer
from apps.guides.models import SurveyResponse
from apps.incidents.constants import IncidentStatus, LeakType
from apps.incidents.models import Company, IncidentLeakItem
from apps.incidents.tests.helpers import make_incident

LIST_URL = "/api/incidents/"
PAGE_SIZE = 20


class IncidentListApiTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.skt = Company.objects.create(name="SK텔레콤", aliases=["skt"])
        self.kt = Company.objects.create(name="KT", aliases=["케이티"])

    def results(self, **params: str) -> list[dict]:
        response = self.client.get(LIST_URL, params)
        self.assertEqual(response.status_code, 200)
        return response.json()["data"]["results"]

    def test_newest_first_with_leaked_labels_only(self) -> None:
        old = make_incident(self.skt, status=IncidentStatus.PUBLIC, notified_at=datetime.date(2026, 1, 1))
        new = make_incident(self.kt, status=IncidentStatus.PUBLIC, notified_at=datetime.date(2026, 5, 1))
        IncidentLeakItem.objects.create(incident=new, leak_type=LeakType.CONTACT, label="휴대전화번호", is_leaked=True)
        IncidentLeakItem.objects.create(incident=new, leak_type=LeakType.FINANCIAL, label="카드번호", is_leaked=False)
        results = self.results()
        self.assertEqual([row["id"] for row in results], [new.pk, old.pk])
        self.assertEqual(results[0]["company_name"], "KT")
        self.assertEqual(results[0]["leaked_labels"], ["휴대전화번호"])
        self.assertEqual(results[0]["response_status"], "ONGOING")

    def test_search_by_name_and_alias_partial(self) -> None:
        skt_incident = make_incident(self.skt, status=IncidentStatus.PUBLIC)
        kt_incident = make_incident(self.kt, status=IncidentStatus.PUBLIC)
        cases = {
            "sk 텔레": [skt_incident.pk],
            "SKT": [skt_incident.pk],
            "ＳＫＴ": [skt_incident.pk],
            "케이": [kt_incident.pk],
            "  ": [kt_incident.pk, skt_incident.pk],
            "없는기업": [],
        }
        for query, expected in cases.items():
            with self.subTest(query=query):
                self.assertEqual(sorted(row["id"] for row in self.results(q=query)), sorted(expected))

    def test_paginated_by_20(self) -> None:
        for _ in range(PAGE_SIZE + 1):
            make_incident(self.skt, status=IncidentStatus.PUBLIC)
        data = self.client.get(LIST_URL).json()["data"]
        self.assertEqual(data["count"], PAGE_SIZE + 1)
        self.assertEqual(len(data["results"]), PAGE_SIZE)
        self.assertIsNotNone(data["next"])
        self.assertEqual(len(self.client.get(LIST_URL, {"page": 2}).json()["data"]["results"]), 1)

    def test_query_count_not_per_incident(self) -> None:
        for _ in range(5):
            incident = make_incident(self.skt, status=IncidentStatus.PUBLIC)
            IncidentLeakItem.objects.create(incident=incident, leak_type=LeakType.CONTACT, label="이름", is_leaked=True)
        with self.assertNumQueries(3):
            self.client.get(LIST_URL)
        with self.assertNumQueries(4):
            self.client.get(LIST_URL, {"q": "skt"})


class IncidentDetailApiTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        company = Company.objects.create(name="SK텔레콤")
        self.incident = make_incident(company, status=IncidentStatus.PUBLIC, affected_count=100,
                                      contact_info="고객센터 114")
        IncidentLeakItem.objects.create(incident=self.incident, leak_type=LeakType.CONTACT, label="휴대전화번호",
                                        is_leaked=True)
        IncidentLeakItem.objects.create(incident=self.incident, leak_type=LeakType.FINANCIAL, label="카드번호",
                                        is_leaked=False)

    def test_detail_includes_leaked_and_not_leaked_items(self) -> None:
        response = self.client.get(f"{LIST_URL}{self.incident.pk}/")
        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["company_name"], "SK텔레콤")
        self.assertEqual(data["affected_count"], 100)
        self.assertEqual(
            [(item["label"], item["is_leaked"]) for item in data["leak_items"]],
            [("휴대전화번호", True), ("카드번호", False)],
        )


    def test_active_count_is_survey_responses(self) -> None:
        url = f"{LIST_URL}{self.incident.pk}/"
        self.assertEqual(self.client.get(url).json()["data"]["active_count"], 0)
        for index in range(2):
            user = User.objects.create_user(email=f"member{index}@example.com", nickname=f"member{index}")
            SurveyResponse.objects.create(user=user, incident=self.incident, payment_linked=Answer.NO,
                                          reused_password=Answer.NO, impersonation_contact=Answer.NO,
                                          damage_occurred=Answer.NO)
        self.assertEqual(self.client.get(url).json()["data"]["active_count"], 2)
