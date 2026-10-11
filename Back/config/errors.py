import logging

from django.http import HttpRequest, JsonResponse
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger("app.error")

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


def _error_body(code: str, message: str, fields: object = None) -> dict[str, object]:
    body: dict[str, object] = {"code": code, "message": message}
    if fields is not None:
        body["fields"] = fields
    return body


# 원문·스택은 로그로만, 응답은 코드 + 일반 문구
def api_exception_handler(exc: Exception, context: dict[str, object]) -> Response:
    response = exception_handler(exc, context)
    if response is None:
        logger.error("unhandled api exception", exc_info=(type(exc), exc, exc.__traceback__))
        return Response(
            _error_body("SERVER_ERROR", GENERIC_MESSAGE),
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    for exception_type, code, message in _ERROR_BY_EXCEPTION:
        if isinstance(exc, exception_type):
            fields = response.data if isinstance(exc, exceptions.ValidationError) else None
            response.data = _error_body(code, message, fields)
            return response

    response.data = _error_body("REQUEST_ERROR", GENERIC_MESSAGE)
    return response


def not_found(request: HttpRequest, exception: Exception) -> JsonResponse:
    return JsonResponse(_error_body("NOT_FOUND", "요청한 정보를 찾을 수 없습니다."), status=404)


def server_error(request: HttpRequest) -> JsonResponse:
    return JsonResponse(_error_body("SERVER_ERROR", GENERIC_MESSAGE), status=500)
