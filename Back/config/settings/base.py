from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# DEBUG는 로컬 env로만
DEBUG = False

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "rest_framework",
    "axes",
    "django_otp",
    "django_otp.plugins.otp_totp",
    "common",
    "apps.accounts",
    "apps.incidents",
    "apps.guides",
    "apps.reports",
    "apps.mypage",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # 맨 바깥 → 잠금·만료 응답에도 no-store
    "common.middleware.NoStoreApiMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django_otp.middleware.OTPMiddleware",
    # 감사 → 만료 순 (만료로 막힌 관리자 요청도 기록)
    "common.middleware.AdminAuditMiddleware",
    "common.middleware.PasswordExpiryMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "axes.middleware.AxesMiddleware",
]

ROOT_URLCONF = "config.urls"
# 301로 경로 존재 노출 X (모든 API는 / 로 끝남)
APPEND_SLASH = False
WSGI_APPLICATION = "config.wsgi.application"

AUTH_USER_MODEL = "accounts.User"
AUTHENTICATION_BACKENDS = [
    "axes.backends.AxesStandaloneBackend",
    "django.contrib.auth.backends.ModelBackend",
]
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
    {"NAME": "apps.accounts.validators.KisaPasswordValidator"},
]

AXES_FAILURE_LIMIT = 5
AXES_COOLOFF_TIME = timedelta(minutes=30)
AXES_LOCKOUT_PARAMETERS = ["username"]
AXES_USERNAME_FORM_FIELD = "email"
AXES_USERNAME_CALLABLE = "apps.accounts.services.axes_username"
AXES_RESET_ON_SUCCESS = True
# 로그인 기록은 CloudWatch로, DB엔 잠금 계산용만
AXES_DISABLE_ACCESS_LOG = True
# 기본 잠금 응답은 이메일 노출 → 공통 에러 형식
AXES_LOCKOUT_CALLABLE = "apps.accounts.exceptions.lockout_response"

OTP_TOTP_ISSUER = "ReturnedHoliday"
# nginx 뒤라 axes는 실제 IP 모름 → IP 제한은 DRF login throttle
SILENCED_SYSTEM_CHECKS = ["axes.W006"]

SESSION_COOKIE_AGE = 60 * 15
SESSION_SAVE_EVERY_REQUEST = True
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
# 프론트가 읽어서 X-CSRFToken으로 전송
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SAMESITE = "Lax"
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"

# 기본 핸들러는 2.5MB 초과 시 디스크 임시 저장 → 메모리만
FILE_UPLOAD_HANDLERS = ["django.core.files.uploadhandler.MemoryFileUploadHandler"]
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = 1024 * 1024

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["rest_framework.authentication.SessionAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_RENDERER_CLASSES": ["config.renderers.DataEnvelopeJSONRenderer"],
    # OPTIONS 메타데이터(입력 필드 정보) 노출 X → 405
    "DEFAULT_METADATA_CLASS": None,
    "DEFAULT_PARSER_CLASSES": [
        "rest_framework.parsers.JSONParser",
        "rest_framework.parsers.MultiPartParser",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "EXCEPTION_HANDLER": "config.errors.api_exception_handler",
    # throttle_scope 지정 뷰만 범위별 제한
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",
        "user": "120/min",
        "login": "10/min",
        "signup": "5/hour",
        "sensitive": "5/hour",
        "search": "60/min",
        "ocr": "10/hour",
        "report": "5/day",
        "otp": "5/min",
        "admin": "120/min",
    },
}

LANGUAGE_CODE = "ko-kr"
TIME_ZONE = "Asia/Seoul"
USE_I18N = True
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# 보관 기간별 분리: 일반 30일 / 보안 이벤트 90일 / 관리자 감사 1년 (docs/security.md 3-6)
LOG_HANDLERS = ("app", "security", "audit")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "plain": {"format": "%(asctime)s %(levelname)s %(name)s %(message)s"},
    },
    # 모든 핸들러 마스킹 (Django·라이브러리 로그 포함)
    "filters": {
        "pii_mask": {"()": "common.log_filters.PiiMaskingFilter"},
    },
    "handlers": {
        name: {"class": "logging.StreamHandler", "formatter": "plain", "filters": ["pii_mask"]}
        for name in LOG_HANDLERS
    },
    "loggers": {
        "django": {"handlers": ["app"], "level": "WARNING"},
        "app": {"handlers": ["app"], "level": "INFO", "propagate": False},
        "app.security": {"handlers": ["security"], "level": "INFO", "propagate": False},
        "axes": {"handlers": ["security"], "level": "INFO", "propagate": False},
        # CSRF 실패·DisallowedHost → 보안 이벤트 (90일)
        "django.security": {"handlers": ["security"], "level": "INFO", "propagate": False},
        "app.audit": {"handlers": ["audit"], "level": "INFO", "propagate": False},
    },
}
