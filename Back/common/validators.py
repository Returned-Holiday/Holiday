import ipaddress
from urllib.parse import urlsplit

from django.core.exceptions import ValidationError
from django.core.validators import URLValidator

URL_MAX_LENGTH = 500
SUMMARY_MAX_LENGTH = 2000
CONTACT_INFO_MAX_LENGTH = 500
STEPS_MAX_LENGTH = 5000
LEAK_ITEMS_TEXT_MAX_LENGTH = 1000
REJECT_REASON_MAX_LENGTH = 500

INVALID_URL_MESSAGE = "https:// 로 시작하는 공식 페이지 주소를 입력해 주세요."

_https_only = URLValidator(schemes=["https"])


def _invalid_url() -> ValidationError:
    return ValidationError(INVALID_URL_MESSAGE, code="invalid_url")


def _is_ip_or_localhost(host: str) -> bool:
    if host == "localhost":
        return True
    try:
        ipaddress.ip_address(host)
    except ValueError:
        return False
    return True


# 서버는 이 URL에 접속 X (SSRF 원천 차단), 형식만 검사
def validate_https_url(value: str) -> None:
    if len(value) > URL_MAX_LENGTH:
        raise _invalid_url()
    try:
        _https_only(value)
    except ValidationError as error:
        raise _invalid_url() from error
    parts = urlsplit(value)
    # 계정정보 포함 URL X
    if parts.username is not None or parts.password is not None:
        raise _invalid_url()
    # IP·localhost 직접 지정 X (내부망 주소)
    if _is_ip_or_localhost(parts.hostname or ""):
        raise _invalid_url()
