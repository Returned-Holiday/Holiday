import secrets
from datetime import timedelta
from types import SimpleNamespace

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import RequestFactory, SimpleTestCase, TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import PasswordHistory, User
from apps.accounts.services import axes_username
from apps.accounts.tests.helpers import create_member, random_password
from apps.accounts.validators import KisaPasswordValidator

# docs/security.md 거부 예시 (비밀값 X)
SECURITY_DOC_WEAK_SAMPLE = "abc12345"


class UserStorageTests(TestCase):
    def test_email_saved_lowercase(self) -> None:
        user = User.objects.create_user(email="  Member@Example.COM ", nickname="member")
        self.assertEqual(user.email, "member@example.com")

    def test_rejects_case_only_duplicate_email(self) -> None:
        User.objects.create_user(email="member@example.com", nickname="first")
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user(email="MEMBER@example.com", nickname="second")

    def test_lookup_normalizes_email(self) -> None:
        user = User.objects.create_user(email="member@example.com", nickname="member")
        for variant in ("MEMBER@example.com", " Member@Example.com "):
            with self.subTest(variant=variant):
                self.assertEqual(User.objects.get_by_natural_key(variant), user)

    def test_str_has_no_email(self) -> None:
        user = User.objects.create_user(email="member@example.com", nickname="member")
        self.assertNotIn("member", str(user))

    def test_delete_user_removes_password_histories(self) -> None:
        user = User.objects.create_user(email="member@example.com", nickname="member")
        # 실행마다 랜덤 값 (고정 비밀번호 X)
        PasswordHistory.objects.create(user=user, password=make_password(secrets.token_urlsafe(16)))
        user.delete()
        self.assertFalse(PasswordHistory.objects.exists())


class KisaPasswordValidatorTests(SimpleTestCase):
    validator = KisaPasswordValidator()

    def assert_rejected(self, value: str, code: str, user: object = None) -> None:
        with self.assertRaises(ValidationError) as context:
            self.validator.validate(value, user)
        self.assertEqual(context.exception.code, code)
        # 응답 메시지에 입력값 X
        self.assertNotIn(value, " ".join(context.exception.messages))

    def test_rejects_security_doc_example(self) -> None:
        self.assert_rejected("abc12345", "password_rule")

    def test_two_classes_need_ten_chars(self) -> None:
        self.assert_rejected("kqmzvtrb7", "password_rule")
        self.validator.validate("kqmzvtrb7w")

    def test_three_classes_need_eight_chars(self) -> None:
        self.assert_rejected("Kqmzv7w", "password_rule")
        self.validator.validate("Kqmzvt7w")

    def test_rejects_over_max_length(self) -> None:
        self.assert_rejected(("Kq7mzvtrbwx" * 6)[:65], "password_too_long")

    def test_rejects_repeat_and_sequence(self) -> None:
        for value in ("Kqmz1111vt", "Kqmz1234vt", "Kq7z4321vt", "Kqabcd7zvt", "Kq7DCBAzvt", "Kq7zqwervt", "Kq7zASDFvt"):
            with self.subTest(value=value):
                self.assert_rejected(value, "password_sequence")

    def test_rejects_email_id(self) -> None:
        user = SimpleNamespace(email="minsu@example.com")
        self.assert_rejected("Kq7MinSuvz", "password_contains_email", user)
        self.validator.validate("Kq7mzvtrbw", user)


class SignupSecurityTests(APITestCase):
    def setUp(self) -> None:
        cache.clear()

    def post_signup(self, **overrides: object) -> Response:
        payload = {
            "email": "member@example.com",
            "password": random_password(),
            "nickname": "member",
            "agree_terms": True,
            "agree_privacy": True,
            "confirm_age": True,
        }
        payload.update(overrides)
        return self.client.post("/api/auth/signup/", payload, format="json")

    def test_rejects_weak_password(self) -> None:
        response = self.post_signup(password=SECURITY_DOC_WEAK_SAMPLE)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["code"], "VALIDATION_ERROR")
        self.assertIn("password", response.json()["fields"])

    def test_rejects_case_only_duplicate(self) -> None:
        create_member(email="member@example.com")
        response = self.post_signup(email="Member@Example.com")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.json()["code"], "CONFLICT")

    def test_requires_all_agreements(self) -> None:
        response = self.post_signup(confirm_age=False)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("confirm_age", response.json()["fields"])

    def test_rejects_nickname_with_special_chars(self) -> None:
        for nickname in ("a", "nick name", "<b>nick</b>", "닉네임!"):
            with self.subTest(nickname=nickname):
                self.assertEqual(self.post_signup(nickname=nickname).status_code, status.HTTP_400_BAD_REQUEST)

    def test_ignores_client_role(self) -> None:
        self.post_signup(is_staff=True, is_superuser=True)
        user = User.objects.get(email="member@example.com")
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)


class LoginSecurityTests(APITestCase):
    def setUp(self) -> None:
        cache.clear()
        self.user, self.raw = create_member()

    def post_login(self, email: str, secret: str) -> Response:
        return self.client.post("/api/auth/login/", {"email": email, "password": secret}, format="json")

    def test_same_response_for_unknown_email_and_wrong_password(self) -> None:
        unknown = self.post_login("nobody@example.com", self.raw)
        wrong = self.post_login("member@example.com", random_password())
        self.assertEqual(unknown.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(unknown.json(), wrong.json())
        self.assertEqual(wrong.json()["code"], "AUTH_FAILED")

    def test_locks_after_five_failures(self) -> None:
        for _ in range(5):
            self.post_login("member@example.com", random_password())
        response = self.post_login("member@example.com", self.raw)
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertEqual(response.json()["code"], "ACCOUNT_LOCKED")
        # 잠금 응답에 이메일 X
        self.assertNotIn(b"member", response.content)

    def test_case_variants_share_lock_count(self) -> None:
        for variant in ("member@example.com", "MEMBER@example.com", "Member@Example.com", " member@EXAMPLE.com", "mEmber@example.com"):
            self.post_login(variant, random_password())
        response = self.post_login("MEMBER@EXAMPLE.COM", self.raw)
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_variant_cannot_bypass_lock(self) -> None:
        for _ in range(5):
            self.post_login("member@example.com", random_password())
        response = self.post_login("MEMBER@example.com", self.raw)
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_direct_authenticate_variant_cannot_bypass_lock(self) -> None:
        factory = RequestFactory()
        for variant in ("member@example.com", "MEMBER@example.com", "Member@Example.com", "mEMBER@example.com", "member@EXAMPLE.com"):
            authenticate(factory.post("/"), email=variant, password=random_password())
        request = factory.post("/")
        self.assertIsNone(authenticate(request, email="MEMBER@EXAMPLE.COM", password=self.raw))
        self.assertTrue(request.axes_locked_out)

    def test_rotates_session_on_login(self) -> None:
        session = self.client.session
        session["probe"] = True
        session.save()
        self.client.cookies[settings.SESSION_COOKIE_NAME] = session.session_key
        self.post_login("member@example.com", self.raw)
        self.assertNotEqual(self.client.cookies[settings.SESSION_COOKIE_NAME].value, session.session_key)

    def test_inactive_user_cannot_login(self) -> None:
        self.user.is_active = False
        self.user.save()
        self.assertEqual(self.post_login("member@example.com", self.raw).json()["code"], "AUTH_FAILED")

    def test_requires_csrf_token(self) -> None:
        client = APIClient(enforce_csrf_checks=True)
        response = client.post("/api/auth/login/", {"email": "member@example.com", "password": self.raw}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        client.get("/api/auth/csrf/")
        token = client.cookies["csrftoken"].value
        response = client.post(
            "/api/auth/login/", {"email": "member@example.com", "password": self.raw}, format="json", HTTP_X_CSRFTOKEN=token
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_reports_expired_password(self) -> None:
        User.objects.filter(pk=self.user.pk).update(password_changed_at=timezone.now() - timedelta(days=91))
        response = self.post_login("member@example.com", self.raw)
        self.assertTrue(response.json()["data"]["password_expired"])
        self.assertTrue(self.client.get("/api/auth/me/").json()["data"]["password_expired"])


class MeSecurityTests(APITestCase):
    def test_requires_login(self) -> None:
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.json()["code"], "AUTH_REQUIRED")


class AxesUsernameTests(SimpleTestCase):
    def test_normalizes_credentials(self) -> None:
        self.assertEqual(axes_username(RequestFactory().post("/"), {"email": " Member@Example.COM "}), "member@example.com")

    def test_falls_back_to_post_body(self) -> None:
        request = RequestFactory().post("/", {"email": "MEMBER@example.com"})
        self.assertEqual(axes_username(request, None), "member@example.com")

    def test_missing_email(self) -> None:
        for credentials in ({}, {"email": ""}, {"email": "   "}, {"email": ["a@b.c"]}):
            with self.subTest(credentials=credentials):
                self.assertIsNone(axes_username(RequestFactory().post("/"), credentials or None))
