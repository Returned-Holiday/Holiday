import unicodedata

from django.core.exceptions import ValidationError

from apps.incidents.constants import ALIAS_MAX_LENGTH, ALIASES_MAX_COUNT

INVALID_ALIASES_MESSAGE = f"별칭은 {ALIASES_MAX_COUNT}개까지, 각 1~{ALIAS_MAX_LENGTH}자로 입력해 주세요."


# NFKC·공백 제거·소문자 (SKT / ＳＫＴ / S K T 같은 표기 통일, 전각 우회 X)
def normalize_company_key(value: str) -> str:
    return "".join(unicodedata.normalize("NFKC", value).split()).lower()


def normalize_aliases(value: object) -> list[str]:
    if not isinstance(value, list) or len(value) > ALIASES_MAX_COUNT:
        raise ValidationError(INVALID_ALIASES_MESSAGE, code="invalid_aliases")
    result: list[str] = []
    for alias in value:
        if not isinstance(alias, str):
            raise ValidationError(INVALID_ALIASES_MESSAGE, code="invalid_aliases")
        key = normalize_company_key(alias)
        if not 1 <= len(key) <= ALIAS_MAX_LENGTH:
            raise ValidationError(INVALID_ALIASES_MESSAGE, code="invalid_aliases")
        if key not in result:
            result.append(key)
    return result
