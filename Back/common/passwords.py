from datetime import timedelta

from django.contrib.auth.base_user import AbstractBaseUser
from django.utils import timezone

PASSWORD_MAX_AGE = timedelta(days=90)


def is_password_expired(user: AbstractBaseUser) -> bool:
    return timezone.now() - user.password_changed_at >= PASSWORD_MAX_AGE
