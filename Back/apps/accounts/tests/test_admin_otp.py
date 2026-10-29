from io import StringIO
from unittest import mock

from django.conf import settings
from django.core.cache import cache
from django.core.management import CommandError, call_command
from django.test import TestCase
from django_otp.oath import totp
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework import status

from apps.accounts.models import User
from apps.accounts.services import register_otp_device
from apps.accounts.tests.helpers import create_member, random_password

GETPASS = "apps.accounts.management.commands.create_admin.getpass"


# 실행 중 생성한 기기 키로 계산 (고정 비밀값 X)
def current_code(device: TOTPDevice) -> str:
    value = totp(device.bin_key, step=device.step, t0=device.t0, digits=device.digits, drift=device.drift)
    return f"{value:0{device.digits}d}"


def wrong_code(device: TOTPDevice) -> str:
    code = current_code(device)
    return code[:-1] + str((int(code[-1]) + 1) % 10)


class OtpApiTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.admin, _ = create_member(email="admin@example.com", nickname="admin", is_staff=True)
        self.device = register_otp_device(self.admin)
        self.client.force_login(self.admin)

    def post(self, code: object) -> object:
        return self.client.post("/api/auth/otp/", {"code": code}, content_type="application/json")

    def test_valid_code_unlocks_admin_api(self) -> None:
        self.assertEqual(self.client.get("/api/admin/incidents/").status_code, status.HTTP_404_NOT_FOUND)
        before = self.client.cookies[settings.SESSION_COOKIE_NAME].value
        self.assertEqual(self.post(current_code(self.device)).status_code, status.HTTP_204_NO_CONTENT)
        # 권한 상승 → 세션 ID 변경
        self.assertNotEqual(self.client.cookies[settings.SESSION_COOKIE_NAME].value, before)
        self.assertEqual(self.client.get("/api/admin/incidents/").status_code, status.HTTP_200_OK)
        self.assertTrue(self.client.get("/api/auth/me/").json()["data"]["otp_verified"])

    def test_failures_same_response(self) -> None:
        responses = [self.post(value) for value in (wrong_code(self.device), "12345", "abcdef", None)]
        bodies = {response.content for response in responses}
        self.assertEqual(len(bodies), 1)
        self.assertEqual(responses[0].status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(responses[0].json()["code"], "OTP_FAILED")
        self.assertEqual(self.client.get("/api/admin/incidents/").status_code, status.HTTP_404_NOT_FOUND)

    def test_rate_limited(self) -> None:
        for _ in range(5):
            self.post(wrong_code(self.device))
        self.assertEqual(self.post(current_code(self.device)).status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_staff_without_device(self) -> None:
        TOTPDevice.objects.all().delete()
        self.assertEqual(self.post("123456").json()["code"], "OTP_FAILED")

    def test_non_staff_and_anonymous_get_404(self) -> None:
        member, _ = create_member(email="member@example.com", nickname="member")
        self.client.force_login(member)
        self.assertEqual(self.post("123456").status_code, status.HTTP_404_NOT_FOUND)
        self.client.logout()
        self.assertEqual(self.post("123456").status_code, status.HTTP_404_NOT_FOUND)


class AdminCommandTests(TestCase):
    def test_create_admin(self) -> None:
        secret = random_password()
        with mock.patch(GETPASS, side_effect=[secret, secret]):
            call_command("create_admin", email="New.Admin@Example.com", nickname="관리자", stdout=StringIO())
        admin = User.objects.get(email="new.admin@example.com")
        self.assertTrue(admin.is_staff)
        self.assertFalse(admin.is_superuser)
        self.assertTrue(admin.check_password(secret))

    def test_create_admin_rejects_weak_or_mismatch(self) -> None:
        cases = (["abc12345", "abc12345"], [random_password(), random_password()])
        for inputs in cases:
            with self.subTest(case=len(inputs)), mock.patch(GETPASS, side_effect=inputs):
                with self.assertRaises(CommandError):
                    call_command("create_admin", email="admin@example.com", nickname="admin", stdout=StringIO())
        self.assertFalse(User.objects.exists())

    def test_register_otp_replaces_device(self) -> None:
        admin, _ = create_member(email="admin@example.com", nickname="admin", is_staff=True)
        output = StringIO()
        call_command("register_otp", email="ADMIN@example.com", stdout=output)
        call_command("register_otp", email="admin@example.com", stdout=output)
        self.assertIn("otpauth://", output.getvalue())
        self.assertEqual(TOTPDevice.objects.filter(user=admin, confirmed=True).count(), 1)

    def test_register_otp_requires_active_admin(self) -> None:
        create_member(email="member@example.com", nickname="member")
        with self.assertRaises(CommandError):
            call_command("register_otp", email="member@example.com", stdout=StringIO())

    def test_deactivate_ends_sessions(self) -> None:
        admin, _ = create_member(email="admin@example.com", nickname="admin", is_staff=True)
        register_otp_device(admin)
        self.client.force_login(admin)
        call_command("deactivate_admin", email="admin@example.com", stdout=StringIO())
        admin.refresh_from_db()
        self.assertFalse(admin.is_active)
        self.assertFalse(TOTPDevice.objects.filter(user=admin).exists())
        self.assertEqual(self.client.get("/api/auth/me/").status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(User.objects.filter(pk=admin.pk).exists())
