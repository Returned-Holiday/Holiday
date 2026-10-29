from datetime import timedelta

from django.contrib.auth.base_user import AbstractBaseUser
from django.utils import timezone

# 비밀번호 정책 값 한곳 (docs/security.md 1)
PASSWORD_MAX_AGE = timedelta(days=90)
PASSWORD_MIN_AGE = timedelta(days=1)
PASSWORD_HISTORY_SIZE = 4


def is_password_expired(user: AbstractBaseUser) -> bool:
    return timezone.now() - user.password_changed_at >= PASSWORD_MAX_AGE


def is_within_min_age(user: AbstractBaseUser) -> bool:
    return timezone.now() - user.password_changed_at < PASSWORD_MIN_AGE
