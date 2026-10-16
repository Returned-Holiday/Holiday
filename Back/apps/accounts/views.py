from django.contrib.auth import authenticate, login, logout
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from .exceptions import AccountLocked, LoginFailed
from .serializers import LoginSerializer, MeSerializer, SignupSerializer
from .services import client_ip, create_member, is_password_expired, security_logger


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
