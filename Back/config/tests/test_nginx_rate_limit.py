import re

from django.conf import settings
from django.core.cache import cache
from django.test import TestCase
from django.urls import Resolver404, resolve

from apps.accounts.tests.helpers import random_password

NGINX_CONF = settings.BASE_DIR.parent / "infra" / "nginx" / "returnedholiday.conf"
LOGIN_LIMIT = 10


# nginx 요청 제한 429도 앱 429와 같은 바이트 (한쪽만 바뀌면 실패)
class NginxRateLimitTests(TestCase):
    def setUp(self) -> None:
        cache.clear()
        self.conf = NGINX_CONF.read_text(encoding="utf-8")

    def test_429_body_matches_app(self) -> None:
        credentials = {"email": "nobody@example.com", "password": random_password()}
        for _ in range(LOGIN_LIMIT):
            self.client.post("/api/auth/login/", credentials, content_type="application/json")
        response = self.client.post("/api/auth/login/", credentials, content_type="application/json")
        self.assertEqual(response.status_code, 429)
        body = re.search(r"return 429 '([^']*)';", self.conf).group(1)
        self.assertEqual(body.encode(), response.content)
        self.assertEqual(response["Content-Type"], "application/json")

    # 엄격 제한 경로가 실제 API와 일치 (경로 이름 바뀌면 실패)
    def test_strict_paths_exist(self) -> None:
        pattern = re.search(r"location ~ \^/api/auth/\(([^)]*)\)/\$", self.conf).group(1)
        for name in pattern.split("|"):
            with self.subTest(name=name):
                try:
                    resolve(f"/api/auth/{name}/")
                except Resolver404:
                    self.fail(f"/api/auth/{name}/ not routed")

    def test_every_api_location_limited(self) -> None:
        for block in re.findall(r"location [^{]*?/api/[^{]*\{(.*?)\n    \}", self.conf, re.S):
            with self.subTest(block=block.strip()[:40]):
                self.assertIn("limit_req zone=rh_api", block)

    # 업로드·외부 과금 경로는 본문 받기 전에 엄격 제한
    def test_ocr_strictly_limited(self) -> None:
        block = re.search(r"location = /api/guides/ocr/ \{(.*?)\n    \}", self.conf, re.S).group(1)
        self.assertIn("limit_req zone=rh_auth", block)

    # 거부 로그에 쿼리스트링 X (에러 로그는 요청 줄 전체를 남김)
    def test_limit_log_not_in_error_log(self) -> None:
        self.assertIn("limit_req_log_level info;", self.conf)
