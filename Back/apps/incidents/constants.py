from django.db import models

COMPANY_NAME_MAX_LENGTH = 100
ALIASES_MAX_COUNT = 20
ALIAS_MAX_LENGTH = 50
LEAK_LABEL_MAX_LENGTH = 100
# INT 상한 (DB마다 다른 범위 통일)
AFFECTED_COUNT_MAX = 2_147_483_647


class LeakType(models.TextChoices):
    CONTACT = "CONTACT", "연락처"
    ACCOUNT = "ACCOUNT", "계정정보"
    RESIDENT_NUMBER = "RESIDENT_NUMBER", "주민등록번호"
    FINANCIAL = "FINANCIAL", "금융정보"
    LOCATION = "LOCATION", "위치정보"
    AUTH_FACTOR = "AUTH_FACTOR", "인증수단 정보"
    OTHER = "OTHER", "기타"


class IncidentStatus(models.TextChoices):
    PUBLIC = "PUBLIC", "공개"
    PRIVATE = "PRIVATE", "비공개"


class ResponseStatus(models.TextChoices):
    ONGOING = "ONGOING", "대응 진행 중"
    CLOSED = "CLOSED", "대응 종료"
