import logging
from collections.abc import Callable

from django.http import HttpRequest, HttpResponse
from django.utils.cache import add_never_cache_headers

from common.passwords import is_password_expired
from common.request import client_ip
from config.errors import error_json

audit_logger = logging.getLogger("app.audit")

API_PREFIX = "/api/"
ADMIN_API_PREFIX = "/api/admin/"
# 만료 상태 허용 (docs/api.md)
PASSWORD_EXPIRY_ALLOWED_PATHS = frozenset(
    {
        "/api/auth/csrf/",
        "/api/auth/login/",
        "/api/auth/logout/",
        "/api/auth/me/",
        "/api/auth/password/",
    }
)
EXPIRY_NOTICE = "비밀번호를 변경한 지 90일이 지났습니다. 비밀번호를 변경해 주세요."
AUDIT_METHODS = frozenset({"GET", "POST", "PUT", "PATCH", "DELETE"})

Handler = Callable[[HttpRequest], HttpResponse]


# 권한 클래스 X → 뷰가 permission_classes 바꿔도 빠지지 않게 경로 기준
class PasswordExpiryMiddleware:
    def __init__(self, get_response: Handler) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        path = request.path_info
        if path.startswith(API_PREFIX) and path not in PASSWORD_EXPIRY_ALLOWED_PATHS:
            user = request.user
            if user.is_authenticated and is_password_expired(user):
                return error_json("PASSWORD_EXPIRED", EXPIRY_NOTICE, 403)
        return self.get_response(request)


# 관리자 API 전부 기록 (조회 포함), 요청 본문·변경 값 X
class AdminAuditMiddleware:
    def __init__(self, get_response: Handler) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)
        if request.path_info.startswith(ADMIN_API_PREFIX):
            user = request.user
            match = request.resolver_match
            # 경로 원문 X → URL 패턴 + 정수 ID만 (로그 위조 방지)
            route = match.route if match else "unresolved"
            target = ",".join(
                f"{key}={value}" for key, value in sorted(match.kwargs.items()) if isinstance(value, int)
            ) if match else ""
            audit_logger.info(
                "admin_api user_id=%s ip=%s method=%s route=%s target=%s status=%s",
                user.pk if user.is_authenticated else None,
                client_ip(request),
                request.method if request.method in AUDIT_METHODS else "OTHER",
                route,
                target or "-",
                response.status_code,
            )
        return response


# 공용 PC·뒤로 가기로 회원 데이터 노출 X
class NoStoreApiMiddleware:
    def __init__(self, get_response: Handler) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)
        if request.path_info.startswith(API_PREFIX):
            add_never_cache_headers(response)
        return response
