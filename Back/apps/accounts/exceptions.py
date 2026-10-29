from django.http import HttpRequest, HttpResponse
from rest_framework import status

from common.responses import error_json
from config.errors import CodedAPIException

LOCKED_MESSAGE = "로그인 시도가 너무 많습니다. 30분 후 다시 시도해 주세요."


# 이메일·비밀번호 중 어느 쪽인지 구분 X
class LoginFailed(CodedAPIException):
    status_code = status.HTTP_401_UNAUTHORIZED
    error_code = "AUTH_FAILED"
    default_detail = "이메일 또는 비밀번호가 일치하지 않습니다."


class AccountLocked(CodedAPIException):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    error_code = "ACCOUNT_LOCKED"
    default_detail = LOCKED_MESSAGE


class EmailTaken(CodedAPIException):
    status_code = status.HTTP_409_CONFLICT
    error_code = "CONFLICT"
    default_detail = "이미 가입된 이메일입니다."


# axes 기본 잠금 응답은 이메일 노출 → 공통 형식으로 교체
def lockout_response(request: HttpRequest, original_response: HttpResponse | None, credentials: dict | None) -> HttpResponse:
    return error_json(AccountLocked.error_code, LOCKED_MESSAGE, status.HTTP_429_TOO_MANY_REQUESTS)


# 형식 오류·코드 불일치·기기 없음 모두 같은 응답
class OtpFailed(CodedAPIException):
    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "OTP_FAILED"
    default_detail = "인증 코드가 올바르지 않습니다."
