from rest_framework.exceptions import NotFound
from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView


# 비관리자 → 404 (관리자 API 존재 숨김)
class IsStaffWithOtp(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        user = request.user
        if not (user and user.is_authenticated and user.is_staff and user.is_verified()):
            raise NotFound
        return True


# OTP 인증 전 관리자 (OTP 입력 API 전용), 비관리자 → 404
class IsStaffBeforeOtp(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        user = request.user
        if not (user and user.is_authenticated and user.is_staff):
            raise NotFound
        return True
