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
