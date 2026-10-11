import secrets

from .base import *  # noqa: F403

# 테스트마다 새로 만드는 키라서 저장소에 비밀값이 남지 않는다
SECRET_KEY = secrets.token_urlsafe(50)
ALLOWED_HOSTS = ["testserver"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
