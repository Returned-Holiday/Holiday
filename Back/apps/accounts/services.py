import logging

from axes.models import AccessAttempt, AccessFailureLog
from django.contrib.auth import SESSION_KEY
from django.contrib.auth.hashers import check_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.sessions.models import Session
from django.db import IntegrityError, transaction
from django.http import HttpRequest
from django.utils import timezone
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework.exceptions import PermissionDenied, ValidationError

from common.passwords import PASSWORD_HISTORY_SIZE, is_password_expired, is_within_min_age

from .constants import CURRENT_MISMATCH_ERROR, MIN_AGE_ERROR, OTP_DEVICE_NAME, REUSE_ERROR
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
        end_user_sessions(user)


def end_user_sessions(user: User) -> None:
    for session in Session.objects.filter(expire_date__gt=timezone.now()):
        if session.get_decoded().get(SESSION_KEY) == str(user.pk):
            session.delete()


def _recent_hashes(user: User) -> list[str]:
    histories = PasswordHistory.objects.filter(user=user).order_by("-created_at", "-id")
    return list(histories.values_list("password", flat=True)[:PASSWORD_HISTORY_SIZE])


# 현재 비밀번호 → 최소 1일(만료 강제 변경 예외) → 규칙 → 현재·최근 4개 재사용 → 저장 (docs/security.md 3-1)
def change_password(user: User, current: str, new: str) -> User:
    with transaction.atomic():
        # 동시 변경 요청 직렬화 (TOCTOU X)
        locked = User.objects.select_for_update().get(pk=user.pk)
        if not locked.check_password(current):
            raise ValidationError({"current_password": [CURRENT_MISMATCH_ERROR]})
        if not is_password_expired(locked) and is_within_min_age(locked):
            raise ValidationError({"new_password": [MIN_AGE_ERROR]})
        try:
            validate_password(new, locked)
        except DjangoValidationError as error:
            raise ValidationError({"new_password": list(error.messages)}) from error
        if locked.check_password(new) or any(check_password(new, hashed) for hashed in _recent_hashes(locked)):
            raise ValidationError({"new_password": [REUSE_ERROR]})
        locked.set_password(new)
        locked.password_changed_at = timezone.now()
        locked.save(update_fields=["password", "password_changed_at"])
        PasswordHistory.objects.create(user=locked, password=locked.password)
        stale = PasswordHistory.objects.filter(user=locked).order_by("-created_at", "-id")[PASSWORD_HISTORY_SIZE:]
        PasswordHistory.objects.filter(pk__in=list(stale.values_list("pk", flat=True))).delete()
    return locked


# 관리자 X (비활성화만), 개인 데이터 CASCADE + 로그인 실패 기록(이메일·IP)도 즉시 파기
def withdraw(user: User, current: str) -> None:
    with transaction.atomic():
        locked = User.objects.select_for_update().get(pk=user.pk)
        if not locked.check_password(current):
            raise ValidationError({"current_password": [CURRENT_MISMATCH_ERROR]})
        if locked.is_staff:
            raise PermissionDenied
        AccessAttempt.objects.filter(username=locked.email).delete()
        AccessFailureLog.objects.filter(username=locked.email).delete()
        end_user_sessions(locked)
        locked.delete()
