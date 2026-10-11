from django.db import models


class LeakType(models.TextChoices):
    CONTACT = "CONTACT", "연락처"
    ACCOUNT = "ACCOUNT", "계정정보"
    RESIDENT_NUMBER = "RESIDENT_NUMBER", "주민등록번호"
    FINANCIAL = "FINANCIAL", "금융정보"
    LOCATION = "LOCATION", "위치정보"
    AUTH_FACTOR = "AUTH_FACTOR", "인증수단 정보"
    OTHER = "OTHER", "기타"
