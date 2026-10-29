import importlib
import os
import sys
from unittest import TestCase, mock

PROD_MODULE = "config.settings.prod"
REQUIRED = ("DJANGO_SECRET_KEY", "DJANGO_ALLOWED_HOSTS", "DJANGO_CSRF_TRUSTED_ORIGINS",
            "DB_NAME", "DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT")


# 운영 설정 값 고정 확인 (시크릿은 자리 값)
class ProdSettingsTests(TestCase):
    def setUp(self) -> None:
        env = {name: "placeholder" for name in REQUIRED}
        with mock.patch.dict(os.environ, env), mock.patch.dict(sys.modules):
            os.environ.pop("AWS_SECRET_ID", None)
            sys.modules.pop(PROD_MODULE, None)
            self.prod = importlib.import_module(PROD_MODULE)

    def test_shared_cache(self) -> None:
        self.assertEqual(self.prod.CACHES["default"]["BACKEND"], "django.core.cache.backends.db.DatabaseCache")

    def test_db_tls_verified(self) -> None:
        options = self.prod.DATABASES["default"]["OPTIONS"]
        self.assertEqual(options["ssl_mode"], "VERIFY_IDENTITY")
        self.assertEqual(options["ssl"], {"ca": self.prod.RDS_CA_BUNDLE})
