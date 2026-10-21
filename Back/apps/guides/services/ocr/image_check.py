from io import BytesIO
from pathlib import PurePath

from django.core.files.uploadedfile import UploadedFile
from PIL import Image

from apps.guides.constants import OCR_FORMATS, OCR_MAX_BYTES, OCR_MAX_PIXELS, OCR_MAX_SIDE
from apps.guides.exceptions import FileTooLarge, UnsupportedFile

# 손상·형식 위장·압축 폭탄 → 모두 형식 오류로
IMAGE_ERRORS = (OSError, SyntaxError, ValueError, Image.DecompressionBombError)


def _read_limited(upload: UploadedFile) -> bytes:
    if upload.size is None or upload.size > OCR_MAX_BYTES:
        raise FileTooLarge
    data = upload.read(OCR_MAX_BYTES + 1)
    if len(data) > OCR_MAX_BYTES:
        raise FileTooLarge
    return data


# 확장자 + 실제 시그니처 + 화소 상한 → 픽셀만 다시 저장 (EXIF 위치·기기 정보 제거 후 외부 전송)
def prepare_image(upload: UploadedFile) -> tuple[bytes, str]:
    data = _read_limited(upload)
    extension = PurePath(upload.name or "").suffix.lower()
    try:
        with Image.open(BytesIO(data)) as probe:
            image_format = probe.format or ""
            width, height = probe.size
            if extension not in OCR_FORMATS.get(image_format, ()):
                raise UnsupportedFile
            if width * height > OCR_MAX_PIXELS or max(width, height) > OCR_MAX_SIDE:
                raise UnsupportedFile
            probe.verify()
        with Image.open(BytesIO(data)) as image:
            pixels = image.convert("RGB")
        output = BytesIO()
        pixels.save(output, format=image_format)
    except IMAGE_ERRORS as error:
        raise UnsupportedFile from error
    return output.getvalue(), image_format.lower()
