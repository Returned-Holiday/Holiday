import secrets

from django.contrib.auth.hashers import make_password
from django.db import IntegrityError, transaction
from django.test import TestCase

from apps.accounts.models import PasswordHistory, User


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
