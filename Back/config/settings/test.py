import secrets

from .base import *  # noqa: F403

# 실행마다 랜덤 키 (저장소에 비밀값 X)
SECRET_KEY = secrets.token_urlsafe(50)
ALLOWED_HOSTS = ["testserver"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
