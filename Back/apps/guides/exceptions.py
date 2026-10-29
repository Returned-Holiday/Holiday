from rest_framework import status

from config.errors import CodedAPIException, Conflict


# 완료 기록이 옛 사고·조건에 묶인 채 대상만 바뀌는 것 방지
class ActionLocked(Conflict):
    default_detail = "완료 기록이 있는 조치는 우선순위와 공개 여부만 바꿀 수 있어요. 새 조치로 등록하고 기존 조치는 비공개로 내려 주세요."


class FileTooLarge(CodedAPIException):
    status_code = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
    error_code = "FILE_TOO_LARGE"
    default_detail = "5MB 이하 이미지만 올릴 수 있어요."


# 확장자·실제 형식 불일치, 손상, 화소 초과 모두 같은 응답
class UnsupportedFile(CodedAPIException):
    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "UNSUPPORTED_FILE"
    default_detail = "JPG·PNG 이미지만 올릴 수 있어요."


# 원인은 로그에만 (키 없음·타임아웃·외부 오류 구분 X)
class OcrUnavailable(CodedAPIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    error_code = "OCR_UNAVAILABLE"
    default_detail = "지금은 이미지를 인식할 수 없어요. 잠시 후 다시 시도해 주세요."
