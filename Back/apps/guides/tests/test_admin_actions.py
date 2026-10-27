from django.core.cache import cache
from django_otp import DEVICE_ID_SESSION_KEY
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.guides.models import Action, ActionCompletion
from apps.guides.serializers import AdminActionSerializer
from apps.guides.tests.helpers import make_incident, make_item, make_user, survey_payload
from apps.incidents.constants import IncidentStatus

LIST_URL = "/api/admin/guides/actions/"


def detail_url(action_id: int) -> str:
    return f"{LIST_URL}{action_id}/"


def payload(**overrides: object) -> dict[str, object]:
    data: dict[str, object] = {
        "incident_id": None,
        "trigger_type": "LEAK_TYPE",
        "leak_type": "CONTACT",
        "survey_key": None,
        "priority": 5,
        "title": "스미싱 주의",
        "steps": "모르는 링크를 누르지 않는다",
        "source_url": "https://www.kisa.or.kr/",
        "status": "PUBLIC",
    }
    data.update(overrides)
    return data


class AdminActionTestCase(APITestCase):
    def setUp(self) -> None:
        cache.clear()
        self.admin = User.objects.create_user(email="admin@example.com", nickname="admin", is_staff=True)
        self.client.force_login(self.admin)
        device = TOTPDevice.objects.create(user=self.admin, name="test", confirmed=True)
        session = self.client.session
        session[DEVICE_ID_SESSION_KEY] = device.persistent_id
        session.save()

    def create(self, **overrides: object) -> dict:
        response = self.client.post(LIST_URL, payload(**overrides), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)
        return response.json()["data"]


class AdminActionApiTests(AdminActionTestCase):
    def test_create_always_private(self) -> None:
        data = self.create()
        self.assertEqual(data["status"], "PRIVATE")
        self.assertIsNone(data["published_at"])
        self.assertEqual(
            set(data),
            {"id", "incident_id", "trigger_type", "leak_type", "survey_key", "priority", "title", "steps",
             "source_url", "status", "published_at"},
        )

    def test_publish_records_first_time_only(self) -> None:
        action_id = self.create()["id"]
        with self.assertLogs("app.audit", "INFO") as logs:
            first = self.client.patch(detail_url(action_id), {"status": "PUBLIC"}, format="json").json()["data"]
        self.assertIn("action=PUBLISH", logs.output[0])
        self.assertIsNotNone(first["published_at"])
        with self.assertLogs("app.audit", "INFO") as logs:
            self.client.patch(detail_url(action_id), {"status": "PRIVATE"}, format="json")
        self.assertIn("action=UNPUBLISH", logs.output[0])
        again = self.client.patch(detail_url(action_id), {"status": "PUBLIC"}, format="json").json()["data"]
        self.assertEqual(again["published_at"], first["published_at"])

    def test_list_filters(self) -> None:
        incident = make_incident()
        self.create()
        self.create(trigger_type="ALWAYS", leak_type=None, incident_id=incident.pk)
        data = self.client.get(LIST_URL, {"incident_id": incident.pk}).json()["data"]
        self.assertEqual(data["count"], 1)
        self.assertEqual(self.client.get(LIST_URL, {"status": "PUBLIC"}).json()["data"]["count"], 0)

    def test_private_incident_special_action_allowed(self) -> None:
        private = make_incident("비공개사", status=IncidentStatus.PRIVATE)
        self.create(trigger_type="ALWAYS", leak_type=None, incident_id=private.pk)

    def test_published_action_reaches_checklist(self) -> None:
        action_id = self.create()["id"]
        self.client.patch(detail_url(action_id), {"status": "PUBLIC"}, format="json")
        incident = make_incident()
        item = make_item(incident)
        self.client.force_login(make_user())
        url = f"/api/guides/incidents/{incident.pk}/"
        answers = survey_payload(leak_items_answer="SELECTED", selected_item_ids=[item.pk])
        self.client.put(f"{url}survey/", answers, format="json")
        titles = [a["title"] for a in self.client.get(f"{url}checklist/").json()["data"]["actions"]]
        self.assertEqual(titles, ["스미싱 주의"])


class AdminActionSecurityTests(AdminActionTestCase):
    def assert_rejected(self, field: str, **overrides: object) -> None:
        response = self.client.post(LIST_URL, payload(**overrides), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, overrides)
        self.assertIn(field, response.json()["fields"])

    def test_trigger_rules_400_not_500(self) -> None:
        self.assert_rejected("leak_type", leak_type=None)
        self.assert_rejected("leak_type", trigger_type="SURVEY", survey_key="PAYMENT_LINKED")
        self.assert_rejected("survey_key", trigger_type="SURVEY", leak_type=None)
        self.assert_rejected("incident_id", trigger_type="ALWAYS", leak_type=None)
        self.assertFalse(Action.objects.exists())

    def test_patch_validates_merged_state(self) -> None:
        action_id = self.create()["id"]
        response = self.client.patch(detail_url(action_id), {"trigger_type": "SURVEY"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Action.objects.get(pk=action_id).trigger_type, "LEAK_TYPE")

    def test_input_limits(self) -> None:
        self.assert_rejected("source_url", source_url="http://example.com")
        self.assert_rejected("priority", priority=6)
        self.assert_rejected("steps", steps="가" * 5001)
        self.assert_rejected("title", title="가" * 201)
        self.assert_rejected("incident_id", trigger_type="ALWAYS", leak_type=None, incident_id=999999)

    def test_choice_error_has_no_input_echo(self) -> None:
        response = self.client.post(LIST_URL, payload(leak_type="<b>NOPE"), format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn(b"NOPE", response.content)

    def test_put_and_delete_not_allowed(self) -> None:
        action_id = self.create()["id"]
        self.assertEqual(self.client.put(detail_url(action_id), payload(), format="json").status_code, 405)
        self.assertEqual(self.client.delete(detail_url(action_id)).status_code, 405)

    def test_non_admin_and_no_otp_get_404(self) -> None:
        staff = User.objects.create_user(email="staff@example.com", nickname="staff", is_staff=True)
        for user in (make_user(), staff):
            with self.subTest(user=user.email):
                self.client.force_login(user)
                self.assertEqual(self.client.get(LIST_URL).status_code, status.HTTP_404_NOT_FOUND)
                self.assertEqual(self.client.post(LIST_URL, payload(), format="json").status_code, 404)
        self.assertFalse(Action.objects.exists())

    def test_id_over_db_range_rejected(self) -> None:
        self.assert_rejected("incident_id", trigger_type="ALWAYS", leak_type=None, incident_id=10**19)
        self.assertEqual(self.client.get(LIST_URL, {"incident_id": 10**19}).status_code, status.HTTP_400_BAD_REQUEST)

    def test_meaning_locked_after_completion(self) -> None:
        incident = make_incident()
        action_id = self.create(trigger_type="ALWAYS", leak_type=None, incident_id=incident.pk)["id"]
        action = Action.objects.get(pk=action_id)
        before = AdminActionSerializer(action).data
        ActionCompletion.objects.create(user=make_user(), incident=incident, action=action)
        for change in (
            {"incident_id": None, "trigger_type": "LEAK_TYPE", "leak_type": "CONTACT"},
            {"incident_id": make_incident("다른사").pk},
            {"title": "전혀 다른 조치"},
            {"steps": "다른 단계"},
            {"source_url": "https://example.com/other"},
        ):
            with self.subTest(change=list(change)):
                response = self.client.patch(detail_url(action_id), change, format="json")
                self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
                self.assertEqual(response.json()["code"], "CONFLICT")
        action.refresh_from_db()
        self.assertEqual(AdminActionSerializer(action).data, before)
        # 같은 값 다시 보내기·순위·공개 상태 변경은 허용
        unchanged = {"title": action.title, "steps": action.steps, "priority": 1, "status": "PUBLIC"}
        response = self.client.patch(detail_url(action_id), unchanged, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_leak_type_and_survey_key_locked_after_completion(self) -> None:
        incident = make_incident()
        user = make_user()
        for fields, change in (
            ({"leak_type": "CONTACT"}, {"leak_type": "FINANCIAL"}),
            ({"trigger_type": "SURVEY", "leak_type": None, "survey_key": "PAYMENT_LINKED"},
             {"survey_key": "REUSED_PASSWORD"}),
        ):
            with self.subTest(change=list(change)):
                action_id = self.create(**fields)["id"]
                ActionCompletion.objects.create(user=user, incident=incident, action_id=action_id)
                response = self.client.patch(detail_url(action_id), change, format="json")
                self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
