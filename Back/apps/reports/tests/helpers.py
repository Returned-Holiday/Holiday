from django.test.client import Client
from django_otp import DEVICE_ID_SESSION_KEY
from django_otp.plugins.otp_totp.models import TOTPDevice

from apps.accounts.models import User

REPORTS_URL = "/api/reports/"
ADMIN_REPORTS_URL = "/api/admin/reports/"


def report_payload(**fields: object) -> dict[str, object]:
    payload = {
        "company_name": "테스트기업",
        "source_url": "https://example.com/notice",
        "notified_at": "2026-10-01",
        "leak_items_text": "이름, 연락처",
    }
    payload.update(fields)
    return payload


def login_admin(client: Client, user: User) -> None:
    client.force_login(user)
    device = TOTPDevice.objects.create(user=user, name="test", confirmed=True)
    session = client.session
    session[DEVICE_ID_SESSION_KEY] = device.persistent_id
    session.save()
