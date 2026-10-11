from rest_framework.exceptions import NotFound
from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView


# 관리자가 아니면 403 대신 404를 돌려 관리자 API의 존재를 드러내지 않는다
class IsStaffWithOtp(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        user = request.user
        if not (user and user.is_authenticated and user.is_staff and user.is_verified()):
            raise NotFound
        return True
