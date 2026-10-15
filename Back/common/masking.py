import re

MASK = "*"

# 고정 길이 수량자만 (ReDoS 방지), 입력 길이는 serializer에서 제한
_EMAIL = re.compile(r"(?<![\w.%+-])([\w.%+-]{1,64})@([A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){1,8})")
_RESIDENT_NUMBER = re.compile(r"(?<!\d)(\d{6})([-\s]?)([1-8])\d{6}(?!\d)")
_CARD_NUMBER = re.compile(r"(?<!\d)(\d{4})([-\s]?)(\d{2})\d{2}\2\d{4}\2(\d{4})(?!\d)")
_PHONE_NUMBER = re.compile(r"(?<!\d)(0(?:1[016789]|2|[3-7]\d))([-\s]?)(\d{3,4})\2\d{4}(?!\d)")
_ACCOUNT_NUMBER = re.compile(r"(?<![\d-])\d{2,6}(?:-\d{2,7}){1,3}(?![\d-])|(?<!\d)\d{10,14}(?!\d)")

ACCOUNT_DIGITS_MIN = 10
ACCOUNT_DIGITS_MAX = 14
ACCOUNT_MASKED_TAIL = 5


def _mask_email(match: re.Match[str]) -> str:
    local, domain = match.group(1), match.group(2)
    keep = min(2, len(local) - 1)
    return f"{local[:keep]}{MASK * (len(local) - keep)}@{domain}"


def _mask_resident_number(match: re.Match[str]) -> str:
    return f"{match.group(1)}{match.group(2)}{match.group(3)}{MASK * 6}"


def _mask_card_number(match: re.Match[str]) -> str:
    sep = match.group(2)
    return f"{match.group(1)}{sep}{match.group(3)}{MASK * 2}{sep}{MASK * 4}{sep}{match.group(4)}"


def _mask_phone_number(match: re.Match[str]) -> str:
    sep = match.group(2)
    return f"{match.group(1)}{sep}{match.group(3)}{sep}{MASK * 4}"


def _mask_account_number(match: re.Match[str]) -> str:
    value = match.group(0)
    digit_count = sum(char.isdigit() for char in value)
    # 날짜·짧은 번호 제외
    if not ACCOUNT_DIGITS_MIN <= digit_count <= ACCOUNT_DIGITS_MAX:
        return value
    chars = list(value)
    remaining = ACCOUNT_MASKED_TAIL
    for index in range(len(chars) - 1, -1, -1):
        if remaining == 0:
            break
        if chars[index].isdigit():
            chars[index] = MASK
            remaining -= 1
    return "".join(chars)


# 이메일 먼저 (이메일 속 숫자 오탐 방지), 계좌는 마지막 (나머지 번호 형식 제외 후)
def mask_pii(text: str) -> str:
    text = _EMAIL.sub(_mask_email, text)
    text = _RESIDENT_NUMBER.sub(_mask_resident_number, text)
    text = _CARD_NUMBER.sub(_mask_card_number, text)
    text = _PHONE_NUMBER.sub(_mask_phone_number, text)
    return _ACCOUNT_NUMBER.sub(_mask_account_number, text)
