from django.db import models

PRIORITY_MIN = 1
PRIORITY_MAX = 5
ACTION_TITLE_MAX_LENGTH = 200


class TriggerType(models.TextChoices):
    LEAK_TYPE = "LEAK_TYPE", "유형"
    SURVEY = "SURVEY", "설문"
    ALWAYS = "ALWAYS", "항상"


class SurveyKey(models.TextChoices):
    PAYMENT_LINKED = "PAYMENT_LINKED", "결제수단 연결"
    REUSED_PASSWORD = "REUSED_PASSWORD", "비밀번호 재사용"
    IMPERSONATION_CONTACT = "IMPERSONATION_CONTACT", "사칭 연락"
    DAMAGE_OCCURRED = "DAMAGE_OCCURRED", "피해 발생"


class Answer(models.TextChoices):
    YES = "YES", "예"
    NO = "NO", "아니요"
    UNKNOWN = "UNKNOWN", "모름"


class PublishStatus(models.TextChoices):
    PUBLIC = "PUBLIC", "공개"
    PRIVATE = "PRIVATE", "비공개"


SELECTED_ITEMS_MAX = 50
SELECTION_ERROR = "이 사고의 유출 항목에서 골라 주세요."
# 1~3순위 = "지금 바로 하세요"
URGENT_PRIORITY_MAX = 3


class LeakItemsAnswer(models.TextChoices):
    SELECTED = "SELECTED", "항목 선택"
    UNKNOWN = "UNKNOWN", "잘 모르겠어요"
    NONE = "NONE", "해당 없음"


class Certainty(models.TextChoices):
    CERTAIN = "CERTAIN", "확실"
    CHECK_NEEDED = "CHECK_NEEDED", "확인 필요"
ACTION_INCIDENT_ERROR = "등록된 사고를 골라 주세요."
TRIGGER_REQUIRED_ERROR = "선택한 트리거에 필요한 값입니다."
TRIGGER_EMPTY_ERROR = "선택한 트리거에서는 비워 두세요."

# OCR (docs/security.md 3-5)
OCR_MAX_BYTES = 5 * 1024 * 1024
# 압축 폭탄 방지 (2,500만 화소 = 휴대폰 화면 캡처 여유)
OCR_MAX_PIXELS = 25_000_000
OCR_MAX_SIDE = 10_000
OCR_FORMATS = {"JPEG": (".jpg", ".jpeg"), "PNG": (".png",)}
OCR_TIMEOUT_SECONDS = 10
# 설정 주소가 바뀌어도 CLOVA 외 호출 X (SSRF)
OCR_ALLOWED_HOST_SUFFIX = ".apigw.ntruss.com"
OCR_TEXT_MAX_LENGTH = 20_000
