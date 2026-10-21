from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django_otp import login as otp_login
from django_otp import match_token
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from common.passwords import is_password_expired
from common.permissions import IsStaffBeforeOtp
from common.request import client_ip

from .exceptions import AccountLocked, LoginFailed, OtpFailed
from .serializers import LoginSerializer, MeSerializer, OtpSerializer, SignupSerializer
from .services import create_member, security_logger


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        return Response(status=status.HTTP_204_NO_CONTENT)


# 비로그인 POST도 CSRF 검사 (DRF 기본은 로그인 사용자만)
@method_decorator(csrf_protect, name="dispatch")
class SignupView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "signup"

    def post(self, request: Request) -> Response:
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = create_member(data["email"], data["password"], data["nickname"])
        security_logger.info("signup user_id=%s ip=%s", user.pk, client_ip(request))
        return Response({"nickname": user.nickname}, status=status.HTTP_201_CREATED)


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "login"

    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        # axes 잠금 표시는 Django 요청 객체에 기록
        user = authenticate(request._request, email=data["email"], password=data["password"])
        if user is None:
            if getattr(request._request, "axes_locked_out", False):
                security_logger.warning("login locked ip=%s", client_ip(request))
                raise AccountLocked
            security_logger.warning("login failed ip=%s", client_ip(request))
            raise LoginFailed
        # 세션 ID 재발급 (세션 고정 방지)
        login(request, user)
        security_logger.info("login user_id=%s ip=%s", user.pk, client_ip(request))
        return Response({"password_expired": is_password_expired(user)})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        user_id = request.user.pk
        logout(request)
        security_logger.info("logout user_id=%s ip=%s", user_id, client_ip(request))
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response(MeSerializer(request.user).data)


class OtpView(APIView):
    permission_classes = [IsStaffBeforeOtp]
    throttle_scope = "otp"

    def post(self, request: Request) -> Response:
        serializer = OtpSerializer(data=request.data)
        # 형식 오류도 같은 실패 응답 (입력 형식 단서 X)
        device = match_token(request.user, serializer.validated_data["code"]) if serializer.is_valid() else None
        if device is None:
            security_logger.warning("otp failed user_id=%s ip=%s", request.user.pk, client_ip(request))
            raise OtpFailed
        # 권한 상승 → 세션 ID 재발급 (세션 고정 방지)
        request.session.cycle_key()
        otp_login(request, device)
        security_logger.info("otp verified user_id=%s ip=%s", request.user.pk, client_ip(request))
        return Response(status=status.HTTP_204_NO_CONTENT)
