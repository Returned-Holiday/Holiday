from config.secrets import get_bool, get_secret

from .base import *  # noqa: F403

SECRET_KEY = get_secret("DJANGO_SECRET_KEY")
DEBUG = get_bool("DJANGO_DEBUG")
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]
CSRF_TRUSTED_ORIGINS = ["http://localhost:5173"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": get_secret("DB_NAME"),
        "USER": get_secret("DB_USER"),
        "PASSWORD": get_secret("DB_PASSWORD"),
        "HOST": get_secret("DB_HOST"),
        "PORT": get_secret("DB_PORT"),
        "OPTIONS": {"charset": "utf8mb4"},
    }
}
