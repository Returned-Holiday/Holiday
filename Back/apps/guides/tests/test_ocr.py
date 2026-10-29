import json
import secrets
from datetime import date
from io import BytesIO
from unittest import mock

import requests
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image, TiffImagePlugin
from rest_framework import status
from rest_framework.test import APITestCase

from apps.guides.constants import OCR_MAX_BYTES
from apps.guides.tests.helpers import make_incident, make_item, make_user
from apps.incidents.constants import IncidentStatus, LeakType
from config.secrets import MissingSecretError

OCR_URL = "/api/guides/ocr/"
TEST_ENDPOINT = "https://test.apigw.ntruss.com/custom/v1/0/general"
CONFIG_PATCH = "apps.guides.services.ocr.client.get_secret"
POST_PATCH = "apps.guides.services.ocr.client.requests.post"


def image_file(name: str = "notice.png", image_format: str = "PNG", size: tuple[int, int] = (40, 20)) -> SimpleUploadedFile:
    buffer = BytesIO()
    image = Image.new("RGB", size, "white")
    exif = Image.Exif()
    # GPS 정보 태그 (재인코딩 후 사라져야 함)
    exif[0x8825] = {2: (37.0, 30.0, 0.0)}
    image.save(buffer, format=image_format, exif=exif)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=f"image/{image_format.lower()}")


def clova_response(*texts: str, status_code: int = 200) -> mock.Mock:
    response = mock.Mock(status_code=status_code)
    response.json.return_value = {
        "images": [{"inferResult": "SUCCESS", "fields": [{"inferText": text} for text in texts]}]
    }
    return response


# 실행마다 랜덤 키 (고정 비밀값 X)
def fake_secrets(endpoint: str = TEST_ENDPOINT) -> mock.Mock:
    values = {"CLOVA_OCR_URL": endpoint, "CLOVA_OCR_SECRET": secrets.token_hex(16)}
    return mock.Mock(side_effect=lambda name: values[name])


class OcrTestCase(APITestCase):
    def setUp(self) -> None:
        cache.clear()
        self.client.force_login(make_user())
        self.incident = make_incident("에스케이텔레콤")
        self.incident.company.aliases = ["skt"]
        self.incident.company.save()
        self.phone = make_item(self.incident, LeakType.CONTACT)
        self.phone.label = "휴대전화번호"
        self.phone.save()
        self.usim = make_item(self.incident, LeakType.AUTH_FACTOR, is_leaked=False)
        self.usim.label = "유심 정보"
        self.usim.save()

    def upload(self, file: SimpleUploadedFile, response: object, endpoint: str = TEST_ENDPOINT) -> tuple:
        with mock.patch(CONFIG_PATCH, fake_secrets(endpoint)), mock.patch(POST_PATCH) as post:
            if isinstance(response, Exception):
                post.side_effect = response
            else:
                post.return_value = response
            result = self.client.post(OCR_URL, {"image": file}, format="multipart")
        return result, post


class OcrApiTests(OcrTestCase):
    def test_matches_company_alias_and_leaked_items(self) -> None:
        text = ("[SKT] 고객님의 휴대전화번호 010-1234-5678, 유심 정보 유출 안내",)
        response, post = self.upload(image_file(), clova_response(*text))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()["data"]
        self.assertEqual(data["incident"], {"id": self.incident.pk, "company_name": "에스케이텔레콤"})
        # 미유출 항목(유심)은 제외
        self.assertEqual(data["matched_items"], [{"id": self.phone.pk, "label": "휴대전화번호"}])
        # 원문·전화번호 응답 X
        self.assertNotIn(b"010", response.content)
        self.assertNotIn("안내".encode(), response.content)
        self.assertEqual(post.call_args.kwargs["allow_redirects"], False)
        self.assertEqual(post.call_args.kwargs["timeout"], 10)
        self.assertEqual(json.loads(post.call_args.kwargs["data"]["message"])["lang"], "ko")

    def test_fullwidth_company_name(self) -> None:
        response, _ = self.upload(image_file(), clova_response("ＳＫＴ 개인정보 안내"))
        self.assertEqual(response.json()["data"]["incident"]["id"], self.incident.pk)

    def test_no_match(self) -> None:
        response, _ = self.upload(image_file(), clova_response("택배 도착 안내"))
        self.assertEqual(response.json()["data"], {"incident": None, "matched_items": []})

    def test_private_incident_not_matched(self) -> None:
        self.incident.status = IncidentStatus.PRIVATE
        self.incident.save()
        response, _ = self.upload(image_file(), clova_response("SKT 휴대전화번호"))
        self.assertIsNone(response.json()["data"]["incident"])

    def test_jpeg_accepted(self) -> None:
        response, _ = self.upload(image_file("notice.JPG", "JPEG"), clova_response("SKT"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class OcrSecurityTests(OcrTestCase):
    def assert_code(self, response: object, http_status: int, code: str) -> None:
        self.assertEqual(response.status_code, http_status)
        self.assertEqual(response.json()["code"], code)

    def test_exif_removed_before_sending(self) -> None:
        _, post = self.upload(image_file(), clova_response("SKT"))
        sent = post.call_args.kwargs["files"]["file"][1]
        with Image.open(BytesIO(sent)) as image:
            self.assertEqual(dict(image.getexif()), {})

    def test_rejects_disguised_or_broken_files(self) -> None:
        cases = (
            image_file("notice.jpg", "PNG"),
            image_file("notice.gif", "GIF"),
            SimpleUploadedFile("notice.png", b"not an image", content_type="image/png"),
            SimpleUploadedFile("notice.png", image_file().read()[:50], content_type="image/png"),
        )
        for file in cases:
            with self.subTest(name=file.name):
                response, post = self.upload(file, clova_response("SKT"))
                self.assert_code(response, status.HTTP_400_BAD_REQUEST, "UNSUPPORTED_FILE")
                post.assert_not_called()

    def test_rejects_pixel_bomb(self) -> None:
        response, post = self.upload(image_file(size=(10_001, 1)), clova_response("SKT"))
        self.assert_code(response, status.HTTP_400_BAD_REQUEST, "UNSUPPORTED_FILE")
        post.assert_not_called()

    def test_rejects_oversized(self) -> None:
        big = SimpleUploadedFile("notice.png", b"0" * (5 * 1024 * 1024 + 1), content_type="image/png")
        response, post = self.upload(big, clova_response("SKT"))
        self.assert_code(response, status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "FILE_TOO_LARGE")
        post.assert_not_called()

    # 파일 5MB 정확히 → 통과 (요청 전체는 multipart 경계만큼 더 큼)
    def test_exact_limit_accepted(self) -> None:
        data = image_file().read()
        exact = SimpleUploadedFile("notice.png", data + b"\0" * (OCR_MAX_BYTES - len(data)), content_type="image/png")
        response, post = self.upload(exact, clova_response("SKT"))
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        post.assert_called_once()

    # 요청이 메모리 처리 상한 초과 → 파일 버려짐 → 413
    def test_request_over_memory_limit(self) -> None:
        huge = SimpleUploadedFile("notice.png", b"0" * (6 * 1024 * 1024 + 1), content_type="image/png")
        response, post = self.upload(huge, clova_response("SKT"))
        self.assert_code(response, status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "FILE_TOO_LARGE")
        post.assert_not_called()

    def test_missing_file(self) -> None:
        with mock.patch(POST_PATCH) as post:
            response = self.client.post(OCR_URL, {}, format="multipart")
        self.assert_code(response, status.HTTP_400_BAD_REQUEST, "UNSUPPORTED_FILE")
        post.assert_not_called()

    # 숫자 아닌 Content-Length → 500 X (F9)
    def test_malformed_content_length_is_400(self) -> None:
        with mock.patch(POST_PATCH) as post:
            response = self.client.post(OCR_URL, b"", content_type="multipart/form-data; boundary=x", CONTENT_LENGTH="abc")
        self.assert_code(response, status.HTTP_400_BAD_REQUEST, "UNSUPPORTED_FILE")
        post.assert_not_called()

    def test_upstream_failures_are_503(self) -> None:
        bad_body = mock.Mock(status_code=200)
        bad_body.json.side_effect = ValueError
        failed = clova_response("SKT")
        failed.json.return_value = {"images": [{"inferResult": "FAILURE"}]}
        for response in (requests.Timeout(), requests.ConnectionError(), clova_response(status_code=500),
                         clova_response(status_code=302), bad_body, failed):
            with self.subTest(response=type(response).__name__):
                result, _ = self.upload(image_file(), response)
                self.assert_code(result, status.HTTP_503_SERVICE_UNAVAILABLE, "OCR_UNAVAILABLE")

    # 개발자 .env와 무관하게 키 없는 상황 고정
    def test_not_configured_is_503(self) -> None:
        missing = mock.Mock(side_effect=MissingSecretError("missing"))
        with mock.patch(CONFIG_PATCH, missing), mock.patch(POST_PATCH) as post:
            response = self.client.post(OCR_URL, {"image": image_file()}, format="multipart")
        self.assert_code(response, status.HTTP_503_SERVICE_UNAVAILABLE, "OCR_UNAVAILABLE")
        post.assert_not_called()

    def test_non_clova_endpoint_not_called(self) -> None:
        for endpoint in ("http://test.apigw.ntruss.com/x", "https://evil.example.com/x", "https://apigw.ntruss.com.evil.com/x"):
            with self.subTest(endpoint=endpoint):
                response, post = self.upload(image_file(), clova_response("SKT"), endpoint)
                self.assert_code(response, status.HTTP_503_SERVICE_UNAVAILABLE, "OCR_UNAVAILABLE")
                post.assert_not_called()

    def test_recognized_text_not_logged(self) -> None:
        # 보안 로그는 app으로 전파 X → 따로 확인, OCR 로거는 성공 시 기록 없음
        with self.assertLogs("app.security", "INFO") as logs, self.assertNoLogs("app.ocr", "INFO"):
            self.upload(image_file(), clova_response("SKT 휴대전화번호 010-1234-5678 홍길동"))
        joined = "\n".join(logs.output)
        self.assertNotIn("010", joined)
        self.assertNotIn("홍길동", joined)
        self.assertIn("matched=True", joined)

    def test_rate_limited_and_login_required(self) -> None:
        for _ in range(10):
            self.upload(image_file(), clova_response("SKT"))
        response, _ = self.upload(image_file(), clova_response("SKT"))
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.client.logout()
        response, _ = self.upload(image_file(), clova_response("SKT"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # 허용 외 해석기는 실행조차 X (TIFF를 .png로 위장)
    def test_other_parsers_never_run(self) -> None:
        buffer = BytesIO()
        Image.new("RGB", (40, 20), "white").save(buffer, format="TIFF")
        disguised = SimpleUploadedFile("notice.png", buffer.getvalue(), content_type="image/png")
        with mock.patch.object(TiffImagePlugin.TiffImageFile, "_open", side_effect=AssertionError("tiff parsed")):
            response, post = self.upload(disguised, clova_response("SKT"))
        self.assert_code(response, status.HTTP_400_BAD_REQUEST, "UNSUPPORTED_FILE")
        post.assert_not_called()

    # "SKT" 안의 "KT" → 더 길게 일치한 SKT 우선 (KT 공지가 더 최신이어도)
    def test_longest_company_match_wins(self) -> None:
        kt = make_incident("KT")
        kt.notified_at = date(2026, 10, 20)
        kt.save()
        response, _ = self.upload(image_file(), clova_response("[SKT] 고객님의 개인정보 유출 안내"))
        self.assertEqual(response.json()["data"]["incident"]["id"], self.incident.pk)
        response, _ = self.upload(image_file(), clova_response("[KT] 고객님의 개인정보 유출 안내"))
        self.assertEqual(response.json()["data"]["incident"]["id"], kt.pk)
