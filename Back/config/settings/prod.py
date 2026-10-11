from config.secrets import get_list, get_secret

from .base import *  # noqa: F403
from .base import REST_FRAMEWORK, SILENCED_SYSTEM_CHECKS

SECRET_KEY = get_secret("DJANGO_SECRET_KEY")
ALLOWED_HOSTS = get_list("DJANGO_ALLOWED_HOSTS")
CSRF_TRUSTED_ORIGINS = get_list("DJANGO_CSRF_TRUSTED_ORIGINS")

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": get_secret("DB_NAME"),
        "USER": get_secret("DB_USER"),
        "PASSWORD": get_secret("DB_PASSWORD"),
        "HOST": get_secret("DB_HOST"),
        "PORT": get_secret("DB_PORT"),
        "OPTIONS": {"charset": "utf8mb4"},
        "CONN_MAX_AGE": 60,
    }
}

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = True
# nginx TLS 종료 → 이 헤더로 https 판단
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 365
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# preload 등록 안 함 (되돌리기 어려움)
SILENCED_SYSTEM_CHECKS = [*SILENCED_SYSTEM_CHECKS, "security.W021"]

# XFF는 nginx 1단계만 신뢰
REST_FRAMEWORK = {**REST_FRAMEWORK, "NUM_PROXIES": 1}
