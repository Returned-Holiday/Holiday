import logging

from django.contrib.auth import SESSION_KEY
from django.contrib.auth.password_validation import validate_password
from django.contrib.sessions.models import Session
from django.db import IntegrityError, transaction
from django.http import HttpRequest
from django.utils import timezone
from django_otp.plugins.otp_totp.models import TOTPDevice

from .constants import OTP_DEVICE_NAME
from .exceptions import EmailTaken
from .models import PasswordHistory, User

security_logger = logging.getLogger("app.security")


# axes 실패 횟수 키 정규화 (대소문자 변형 잠금 우회 X), 조회 순서는 axes 기본과 같음
def axes_username(request: HttpRequest, credentials: dict | None) -> str | None:
    source = credentials if credentials else getattr(request, "data", request.POST)
    email = source.get("email")
    if not isinstance(email, str) or not email.strip():
        return None
    return User.objects.normalize_login_email(email)


def create_member(email: str, password: str, nickname: str) -> User:
    # 중복 확인 후 생성 X → 유일 제약으로 판단 (TOCTOU)
    try:
        with transaction.atomic():
            user = User.objects.create_user(email=email, password=password, nickname=nickname)
            PasswordHistory.objects.create(user=user, password=user.password)
    except IntegrityError as error:
        raise EmailTaken from error
    return user


# 서버 명령 전용 (화면·API X), 비밀번호 규칙은 회원과 같음
def create_admin(email: str, nickname: str, password: str) -> User:
    validate_password(password, User(email=User.objects.normalize_login_email(email), nickname=nickname))
    with transaction.atomic():
        user = create_member(email, password, nickname)
        user.is_staff = True
        user.save(update_fields=["is_staff"])
    return user


def get_active_admin(email: str) -> User | None:
    return User.objects.filter(
        email=User.objects.normalize_login_email(email), is_staff=True, is_active=True
    ).first()


# 기기 하나만 (기존 기기 교체)
def register_otp_device(user: User) -> TOTPDevice:
    with transaction.atomic():
        TOTPDevice.objects.filter(user=user).delete()
        return TOTPDevice.objects.create(user=user, name=OTP_DEVICE_NAME, confirmed=True)


# 삭제 X 비활성화 (검수 기록 PROTECT), OTP 기기·로그인 세션 모두 끊음
def deactivate_admin(user: User) -> None:
    with transaction.atomic():
        user.is_active = False
        user.save(update_fields=["is_active"])
        TOTPDevice.objects.filter(user=user).delete()
        for session in Session.objects.filter(expire_date__gt=timezone.now()):
            if session.get_decoded().get(SESSION_KEY) == str(user.pk):
                session.delete()
