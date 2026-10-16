from django.http import HttpRequest
from rest_framework.request import Request

AUDIT_ACTIONS = frozenset({"VIEW", "CREATE", "UPDATE", "DELETE", "PUBLISH", "UNPUBLISH", "APPROVE", "REJECT"})
DEFAULT_ACTION_BY_METHOD = {
    "GET": "VIEW",
    "HEAD": "VIEW",
    "POST": "CREATE",
    "PUT": "UPDATE",
    "PATCH": "UPDATE",
    "DELETE": "DELETE",
}


# 메소드로 구분 안 되는 행위 (공개 전환·승인·반려) → 뷰에서 지정, 감사 미들웨어가 기록
def set_audit_action(request: HttpRequest | Request, action: str) -> None:
    if action not in AUDIT_ACTIONS:
        raise ValueError("unknown audit action")
    # DRF Request → 미들웨어가 보는 Django 요청에 기록
    getattr(request, "_request", request).audit_action = action


# 허용 값만 기록 (로그 위조 X)
def resolve_audit_action(request: HttpRequest) -> str:
    action = getattr(request, "audit_action", None)
    if action in AUDIT_ACTIONS:
        return action
    return DEFAULT_ACTION_BY_METHOD.get(request.method or "", "OTHER")
