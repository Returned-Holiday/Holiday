import logging

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.throttling import BaseThrottle

from .constants import PASSWORD_MAX_AGE
from .exceptions import EmailTaken
from .models import PasswordHistory, User

security_logger = logging.getLogger("app.security")


# XFF는 NUM_PROXIES 설정만큼만 신뢰 (DRF throttle과 같은 기준)
def client_ip(request: Request) -> str:
    return BaseThrottle().get_ident(request)


def is_password_expired(user: User) -> bool:
    return timezone.now() - user.password_changed_at >= PASSWORD_MAX_AGE


def create_member(email: str, password: str, nickname: str) -> User:
    # 중복 확인 후 생성 X → 유일 제약으로 판단 (TOCTOU)
    try:
        with transaction.atomic():
            user = User.objects.create_user(email=email, password=password, nickname=nickname)
            PasswordHistory.objects.create(user=user, password=user.password)
    except IntegrityError as error:
        raise EmailTaken from error
    return user
