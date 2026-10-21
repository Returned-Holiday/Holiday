import logging

from django.contrib.auth import SESSION_KEY
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404, HttpRequest, JsonResponse
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler

from common.request import client_ip
from common.responses import error_body, error_json

logger = logging.getLogger("app.error")
security_logger = logging.getLogger("app.security")

GENERIC_MESSAGE = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."

_ERROR_BY_EXCEPTION: list[tuple[type[exceptions.APIException], str, str]] = [
    (exceptions.ValidationError, "VALIDATION_ERROR", "입력값을 확인해 주세요."),
    (exceptions.ParseError, "VALIDATION_ERROR", "입력값을 확인해 주세요."),
    (exceptions.NotAuthenticated, "AUTH_REQUIRED", "로그인이 필요합니다."),
    (exceptions.AuthenticationFailed, "AUTH_REQUIRED", "로그인이 필요합니다."),
    (exceptions.PermissionDenied, "FORBIDDEN", "요청을 처리할 권한이 없습니다."),
    (exceptions.NotFound, "NOT_FOUND", "요청한 정보를 찾을 수 없습니다."),
    (exceptions.MethodNotAllowed, "METHOD_NOT_ALLOWED", "허용되지 않은 요청입니다."),
    (exceptions.UnsupportedMediaType, "UNSUPPORTED_MEDIA_TYPE", "지원하지 않는 형식입니다."),
    (exceptions.Throttled, "RATE_LIMITED", "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."),
]


class CodedAPIException(exceptions.APIException):
    error_code = "REQUEST_ERROR"
    default_detail = GENERIC_MESSAGE


class Conflict(CodedAPIException):
    status_code = status.HTTP_409_CONFLICT
    error_code = "CONFLICT"
    default_detail = "이미 사용 중이거나 처리할 수 없는 요청입니다."


# 원문·스택은 로그로만, 응답은 코드 + 일반 문구
def api_exception_handler(exc: Exception, context: dict[str, object]) -> Response:
    # Django 예외도 코드 매핑 (get_object_or_404 → NOT_FOUND)
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, DjangoPermissionDenied):
        exc = exceptions.PermissionDenied()
    response = exception_handler(exc, context)
    if response is None:
        logger.error("unhandled api exception", exc_info=(type(exc), exc, exc.__traceback__))
        return Response(
            error_body("SERVER_ERROR", GENERIC_MESSAGE),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # 403·429 보안 이벤트 (401 변환 전 → 예외 종류로)
    if isinstance(exc, (exceptions.PermissionDenied, exceptions.Throttled)):
        _log_denied(context, response.status_code)

    # 404에 Allow X (있는 경로·메소드 노출 X)
    if response.status_code == status.HTTP_404_NOT_FOUND:
        context["view"].headers.pop("Allow", None)

    # 고정 문구만 (입력값 X)
    if isinstance(exc, CodedAPIException):
        response.data = error_body(exc.error_code, exc.default_detail)
        return response

    # 세션 인증은 DRF가 403으로 바꿈 → 로그인 필요는 401
    if isinstance(exc, (exceptions.NotAuthenticated, exceptions.AuthenticationFailed)):
        response.status_code = status.HTTP_401_UNAUTHORIZED

    for exception_type, code, message in _ERROR_BY_EXCEPTION:
        if isinstance(exc, exception_type):
            fields = response.data if isinstance(exc, exceptions.ValidationError) else None
            response.data = error_body(code, message, fields)
            return response

    response.data = error_body("REQUEST_ERROR", GENERIC_MESSAGE)
    return response


# 경로 원문 X → URL 패턴만 (로그 위조 방지)
def _log_denied(context: dict[str, object], status_code: int) -> None:
    request = context["request"]
    user = request.user
    # CSRF 실패 시 DRF가 익명 처리 → 세션의 사용자 ID
    session = getattr(getattr(request, "_request", request), "session", {})
    user_id = user.pk if user.is_authenticated else session.get(SESSION_KEY)
    match = request.resolver_match
    security_logger.warning(
        "api_denied status=%s user_id=%s ip=%s route=%s",
        status_code,
        user_id,
        client_ip(request),
        match.route if match else "unresolved",
    )


def not_found(request: HttpRequest, exception: Exception) -> JsonResponse:
    return error_json("NOT_FOUND", "요청한 정보를 찾을 수 없습니다.", 404)


def server_error(request: HttpRequest) -> JsonResponse:
    return error_json("SERVER_ERROR", GENERIC_MESSAGE, 500)
