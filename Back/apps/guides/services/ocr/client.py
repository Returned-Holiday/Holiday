import json
import logging
import time
import uuid
from urllib.parse import urlsplit

import requests

from apps.guides.constants import OCR_ALLOWED_HOST_SUFFIX, OCR_TEXT_MAX_LENGTH, OCR_TIMEOUT_SECONDS
from apps.guides.exceptions import OcrUnavailable
from config.secrets import MissingSecretError, get_secret

logger = logging.getLogger("app.ocr")
MIME_TYPES = {"jpeg": "image/jpeg", "png": "image/png"}


def _endpoint() -> tuple[str, str]:
    try:
        url, key = get_secret("CLOVA_OCR_URL"), get_secret("CLOVA_OCR_SECRET")
    except MissingSecretError as error:
        logger.warning("ocr not configured")
        raise OcrUnavailable from error
    parts = urlsplit(url)
    # https + CLOVA 도메인만 (설정 오류·변조 시 외부 호출 X)
    if parts.scheme != "https" or not (parts.hostname or "").endswith(OCR_ALLOWED_HOST_SUFFIX):
        logger.warning("ocr endpoint rejected")
        raise OcrUnavailable
    return url, key


def _texts(body: object) -> list[str]:
    if not isinstance(body, dict) or not isinstance(body.get("images"), list) or not body["images"]:
        raise OcrUnavailable
    image = body["images"][0]
    if not isinstance(image, dict) or image.get("inferResult") != "SUCCESS":
        raise OcrUnavailable
    if not isinstance(image.get("fields"), list):
        raise OcrUnavailable
    fields = [field for field in image["fields"] if isinstance(field, dict)]
    return [field["inferText"] for field in fields if isinstance(field.get("inferText"), str)]


# 인식 텍스트는 반환만 (저장·로그 X), 실패 원인은 종류·상태 코드만 로그
def extract_text(image: bytes, image_format: str) -> str:
    url, key = _endpoint()
    message = {
        "version": "V2",
        # 한글 인식 힌트
        "lang": "ko",
        "requestId": uuid.uuid4().hex,
        "timestamp": int(time.time() * 1000),
        "images": [{"format": image_format, "name": "notice"}],
    }
    try:
        response = requests.post(
            url,
            headers={"X-OCR-SECRET": key},
            data={"message": json.dumps(message)},
            files={"file": (f"notice.{image_format}", image, MIME_TYPES[image_format])},
            timeout=OCR_TIMEOUT_SECONDS,
            # 리다이렉트 따라가지 않음 (다른 호스트로 키 전송 X)
            allow_redirects=False,
        )
        if response.status_code != requests.codes.ok:
            logger.warning("ocr upstream status=%s", response.status_code)
            raise OcrUnavailable
        texts = _texts(response.json())
    except (requests.RequestException, ValueError) as error:
        logger.warning("ocr upstream error=%s", type(error).__name__)
        raise OcrUnavailable from error
    return " ".join(texts)[:OCR_TEXT_MAX_LENGTH]
