import datetime

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import RestrictedError
from django.http import Http404
from django.test import SimpleTestCase, TestCase
from rest_framework.settings import api_settings

from apps.incidents.constants import (
    AFFECTED_COUNT_MAX,
    ALIAS_MAX_LENGTH,
    ALIASES_MAX_COUNT,
    IncidentStatus,
    LeakType,
    SEARCH_QUERY_MAX_LENGTH,
    ResponseStatus,
)
from apps.incidents.models import Company, Incident, IncidentLeakItem
from apps.incidents.services import get_public_incident_or_404, get_public_incidents, save_company
from apps.incidents.tests.helpers import make_incident
from apps.incidents.validators import normalize_aliases
from apps.incidents.views import IncidentListView
from common.validators import SUMMARY_MAX_LENGTH


class AliasNormalizeTests(SimpleTestCase):
    def test_removes_spaces_lowercases_and_dedupes(self) -> None:
        self.assertEqual(normalize_aliases([" S K T ", "SKT", "Sk 텔레콤"]), ["skt", "sk텔레콤"])

    def test_fullwidth_same_key(self) -> None:
        self.assertEqual(normalize_aliases(["ＳＫＴ", "ｓｋ　텔레콤"]), ["skt", "sk텔레콤"])

    def test_rejects_invalid_values(self) -> None:
        cases = {
            "not_list": "skt",
            "too_many": [f"a{index}" for index in range(ALIASES_MAX_COUNT + 1)],
            "blank": ["   "],
            "too_long": ["a" * (ALIAS_MAX_LENGTH + 1)],
            "not_str": [123],
        }
        for name, value in cases.items():
            with self.subTest(name=name), self.assertRaises(ValidationError):
                normalize_aliases(value)

    def test_accepts_limits(self) -> None:
        value = [f"a{index}" for index in range(ALIASES_MAX_COUNT - 1)] + ["b" * ALIAS_MAX_LENGTH]
        self.assertEqual(len(normalize_aliases(value)), ALIASES_MAX_COUNT)


class CompanyConflictTests(TestCase):
    def setUp(self) -> None:
        Company.objects.create(name="SK텔레콤", aliases=["skt"])

    def assert_conflict(self, company: Company, field: str) -> None:
        with self.assertRaises(ValidationError) as ctx:
            company.full_clean()
        self.assertEqual(ctx.exception.error_dict[field][0].code, "conflict")

    def test_rejects_alias_of_other_company(self) -> None:
        self.assert_conflict(Company(name="KT", aliases=["S K T"]), "aliases")

    def test_rejects_alias_equal_to_other_company_name(self) -> None:
        self.assert_conflict(Company(name="에스케이", aliases=["sk 텔레콤"]), "aliases")

    def test_rejects_name_equal_to_other_company_alias(self) -> None:
        self.assert_conflict(Company(name="SKT", aliases=[]), "name")

    def test_rejects_fullwidth_variant_of_other_alias(self) -> None:
        self.assert_conflict(Company(name="KT", aliases=["ＳＫＴ"]), "aliases")

    def test_own_aliases_not_conflict_on_update(self) -> None:
        company = Company.objects.get(name="SK텔레콤")
        company.aliases = ["SKT", "에스케이티"]
        company.full_clean()
        self.assertEqual(company.aliases, ["skt", "에스케이티"])


class SaveCompanyTests(TestCase):
    def setUp(self) -> None:
        save_company(Company(name="SK텔레콤", aliases=["SKT"]))

    def test_saves_normalized(self) -> None:
        company = save_company(Company(name="KT", aliases=[" 케이 티 "]))
        company.refresh_from_db()
        self.assertEqual(company.aliases, ["케이티"])

    def test_conflict_not_saved(self) -> None:
        for company in (Company(name="KT", aliases=["skt"]), Company(name="ＳＫＴ", aliases=[])):
            with self.subTest(name=company.name), self.assertRaises(ValidationError) as ctx:
                save_company(company)
            self.assertEqual(next(iter(ctx.exception.error_dict.values()))[0].code, "conflict")
        self.assertEqual(Company.objects.count(), 1)

    def test_duplicate_name_rejected(self) -> None:
        with self.assertRaises(ValidationError) as ctx:
            save_company(Company(name="SK텔레콤"))
        self.assertIn("name", ctx.exception.error_dict)


class IncidentConstraintTests(TestCase):
    def setUp(self) -> None:
        self.company = Company.objects.create(name="테스트기업")

    def test_defaults_private_and_ongoing(self) -> None:
        incident = make_incident(self.company)
        self.assertEqual(incident.status, IncidentStatus.PRIVATE)
        self.assertEqual(incident.response_status, ResponseStatus.ONGOING)

    def test_db_rejects_unknown_status_values(self) -> None:
        for field in ("status", "response_status"):
            with self.subTest(field=field), self.assertRaises(IntegrityError), transaction.atomic():
                make_incident(self.company, **{field: "HACKED"})

    def test_db_rejects_unknown_leak_type(self) -> None:
        incident = make_incident(self.company)
        with self.assertRaises(IntegrityError), transaction.atomic():
            IncidentLeakItem.objects.create(incident=incident, leak_type="HACKED", label="이름", is_leaked=True)

    def test_validates_url_length_and_count(self) -> None:
        cases = {
            "source_url": "http://example.com/notice",
            "summary": "가" * (SUMMARY_MAX_LENGTH + 1),
            "affected_count": AFFECTED_COUNT_MAX + 1,
        }
        for field, value in cases.items():
            incident = Incident(company=self.company, notified_at=datetime.date(2026, 10, 1), summary="요약",
                                source_url="https://example.com/notice")
            setattr(incident, field, value)
            with self.subTest(field=field), self.assertRaises(ValidationError) as ctx:
                incident.full_clean()
            self.assertIn(field, ctx.exception.error_dict)

    def test_company_with_incident_not_deletable(self) -> None:
        make_incident(self.company)
        with self.assertRaises(RestrictedError):
            self.company.delete()

    def test_incident_delete_removes_leak_items(self) -> None:
        incident = make_incident(self.company)
        IncidentLeakItem.objects.create(incident=incident, leak_type=LeakType.CONTACT, label="휴대전화번호",
                                        is_leaked=True)
        incident.delete()
        self.assertFalse(IncidentLeakItem.objects.exists())


class PublicIncidentServiceTests(TestCase):
    def setUp(self) -> None:
        company = Company.objects.create(name="테스트기업")
        self.public = make_incident(company, status=IncidentStatus.PUBLIC)
        self.private = make_incident(company)

    def test_list_excludes_private(self) -> None:
        self.assertEqual(list(get_public_incidents()), [self.public])

    def test_private_and_missing_are_404(self) -> None:
        for incident_id in (self.private.pk, self.private.pk + 100):
            with self.subTest(incident_id=incident_id), self.assertRaises(Http404):
                get_public_incident_or_404(incident_id)

    def test_public_found(self) -> None:
        self.assertEqual(get_public_incident_or_404(self.public.pk), self.public)


class IncidentApiSecurityTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.company = Company.objects.create(name="SK텔레콤", aliases=["skt"])
        self.public = make_incident(self.company, status=IncidentStatus.PUBLIC)
        self.private = make_incident(self.company)
        IncidentLeakItem.objects.create(incident=self.public, leak_type=LeakType.CONTACT, label="휴대전화번호",
                                        is_leaked=True)

    def list_ids(self, **params: str) -> list[int]:
        return [row["id"] for row in self.client.get("/api/incidents/", params).json()["data"]["results"]]

    def test_private_hidden_in_list_and_search(self) -> None:
        self.assertEqual(self.list_ids(), [self.public.pk])
        self.assertEqual(self.list_ids(q="skt"), [self.public.pk])

    def test_private_and_missing_detail_same_404(self) -> None:
        bodies = []
        for incident_id in (self.private.pk, self.private.pk + 100):
            response = self.client.get(f"/api/incidents/{incident_id}/")
            self.assertEqual(response.status_code, 404)
            bodies.append(response.json())
        self.assertEqual(bodies[0], bodies[1])

    def test_only_public_fields_exposed(self) -> None:
        row = self.client.get("/api/incidents/").json()["data"]["results"][0]
        self.assertEqual(set(row), {"id", "company_name", "notified_at", "response_status", "leaked_labels"})
        detail = self.client.get(f"/api/incidents/{self.public.pk}/").json()["data"]
        self.assertEqual(set(detail), {"id", "company_name", "notified_at", "occurred_at", "affected_count", "summary",
                                       "source_url", "contact_info", "response_status", "active_count", "leak_items"})
        self.assertEqual(set(detail["leak_items"][0]), {"id", "label", "is_leaked"})

    def test_query_over_limit_rejected(self) -> None:
        response = self.client.get("/api/incidents/", {"q": "가" * (SEARCH_QUERY_MAX_LENGTH + 1)})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "VALIDATION_ERROR")
        self.assertIn("q", response.json()["fields"])

    def test_injection_strings_are_plain_text(self) -> None:
        for query in ("' OR '1'='1", "%", "_", "\\"):
            with self.subTest(query=query):
                response = self.client.get("/api/incidents/", {"q": query})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()["data"]["results"], [])

    def test_page_size_not_client_controlled(self) -> None:
        for _ in range(25):
            make_incident(self.company, status=IncidentStatus.PUBLIC)
        data = self.client.get("/api/incidents/", {"page_size": 1000, "limit": 1000}).json()["data"]
        self.assertEqual(len(data["results"]), 20)

    def test_search_throttled(self) -> None:
        self.assertEqual(IncidentListView.throttle_scope, "search")
        self.assertEqual(api_settings.DEFAULT_THROTTLE_RATES["search"], "60/min")
