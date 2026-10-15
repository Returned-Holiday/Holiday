import secrets
from types import SimpleNamespace

from django.contrib.auth.hashers import make_password
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import SimpleTestCase, TestCase

from apps.accounts.models import PasswordHistory, User
from apps.accounts.validators import KisaPasswordValidator


class UserStorageTests(TestCase):
    def test_email_saved_lowercase(self) -> None:
        user = User.objects.create_user(email="  Member@Example.COM ", nickname="member")
        self.assertEqual(user.email, "member@example.com")

    def test_rejects_case_only_duplicate_email(self) -> None:
        User.objects.create_user(email="member@example.com", nickname="first")
        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.create_user(email="MEMBER@example.com", nickname="second")

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
