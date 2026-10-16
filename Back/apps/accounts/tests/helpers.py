import secrets

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from apps.accounts.models import User

MAX_TRIES = 100


# 실행마다 랜덤 비밀번호 (고정값 X)
def random_password() -> str:
    for _ in range(MAX_TRIES):
        candidate = "Aa1!" + secrets.token_urlsafe(12)
        try:
            validate_password(candidate)
        except ValidationError:
            continue
        return candidate
    raise RuntimeError("valid password not generated")


def create_member(email: str = "member@example.com", nickname: str = "member", **extra: object) -> tuple[User, str]:
    raw = random_password()
    user = User.objects.create_user(email=email, password=raw, nickname=nickname, **extra)
    return user, raw
