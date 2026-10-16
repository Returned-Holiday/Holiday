import logging

from django.db import IntegrityError, transaction
from django.http import HttpRequest

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
