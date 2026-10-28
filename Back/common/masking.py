import re

MASK = "*"

# 칸마다 따로 (010-1234 5678, 010 - 1234 같은 혼용 허용)
_SEP = r"[-.\s]{0,3}"

# 고정 길이 수량자만 (ReDoS 방지), 입력 길이는 serializer에서 제한
_EMAIL = re.compile(r"(?<![\w.%+-])([\w.%+-]{1,64})@([A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){1,8})")
_RESIDENT_NUMBER = re.compile(rf"(?<!\d)(\d{{6}})({_SEP})([1-8])\d{{6}}(?!\d)")
_CARD_NUMBER = re.compile(
    rf"(?<!\d)(\d{{4}})({_SEP})(\d{{2}})\d{{2}}({_SEP})\d{{4}}({_SEP})(\d{{4}})(?!\d)"
)
# 아멕스 4-6-5
_AMEX_CARD_NUMBER = re.compile(
    rf"(?<!\d)(3[47]\d{{2}})({_SEP})(\d{{2}})\d{{4}}({_SEP})\d{{2}}(\d{{3}})(?!\d)"
)
# (02)1234-5678 괄호 지역번호 포함
_PHONE_NUMBER = re.compile(
    rf"(?<![\d+])((?:\+82{_SEP}0?|0)(?:1[016789]|2|[3-7]\d))(\)?{_SEP})(\d{{3,4}})({_SEP})\d{{4}}(?!\d)"
)
# 계좌는 - 만 (. 허용 시 IP·금액 오탐), 형식 애매하면 가림 쪽
_ACCOUNT_NUMBER = re.compile(r"(?<![\d-])\d{2,6}(?:-\d{2,7}){1,3}(?![\d-])|(?<!\d)\d{10,14}(?!\d)")
# 콜론 붙은 경우만 (이름 주소 유출 같은 항목명 오탐 X)
_NAME = re.compile(r"(성명|이름|성함|고객명)(\s{0,3}[:：]\s{0,3})([가-힣])([가-힣]{1,3})")
# user_id= 같은 로그 필드 제외 (앞이 영문·숫자·_ 아님)
_ACCOUNT_ID = re.compile(r"(?<![A-Za-z0-9_])(아이디|ID|계정)(\s{0,3}[:：=]?\s{0,3})([A-Za-z0-9._-]{3,30})(?![A-Za-z0-9._@-])")
# 여권: 영문 1 + 숫자 8, 신형 영문 1 + 숫자 3 + 영문 1 + 숫자 4
_PASSPORT_NUMBER = re.compile(r"(?<![A-Za-z0-9])([A-Z](?:\d{4}|\d{3}[A-Z]))\d{4}(?![A-Za-z0-9])")
# 운전면허: 지역번호·지역명 + 연도 2 + 일련 6 + 검증 2 (하이픈 없는 12자리는 계좌 규칙)
_DRIVER_LICENSE = re.compile(r"(?<![\d-])(\d{2}-|[가-힣]{2}\s?)(\d{2}-)\d{6}-\d{2}(?![\d-])")
# 주소: 도로명·동 이름은 남기고 건물번호·번지 가림, 숫자 뒤 한글 단위면 제외 (2건, 2개)
_ADDRESS_END = r"(?=번길|번지|[\s,.()\[\]]|$)"
_ROAD_ADDRESS = re.compile(rf"(?<=[가-힣])[로길]\s?\d{{1,5}}(?:-\d{{1,5}})?{_ADDRESS_END}")
_LOT_ADDRESS = re.compile(rf"(?<=[가-힣])[동리]\s?\d{{1,5}}(?:-\d{{1,5}})?{_ADDRESS_END}")
# 101동 1203호, 단독 1203호 (2호선·제1호 제외)
_BUILDING_UNIT = re.compile(r"(?<![\d제])\d{1,4}동\s?\d{1,5}호(?![가-힣\d])|(?<![\d제])\d{1,5}호(?![가-힣\d])")

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
    first, sep1, kept, sep2, sep3, last = match.groups()
    return f"{first}{sep1}{kept}{MASK * 2}{sep2}{MASK * 4}{sep3}{last}"


def _mask_amex_card_number(match: re.Match[str]) -> str:
    first, sep1, kept, sep2, last = match.groups()
    return f"{first}{sep1}{kept}{MASK * 4}{sep2}{MASK * 2}{last}"


def _mask_phone_number(match: re.Match[str]) -> str:
    prefix, sep1, middle, sep2 = match.groups()
    return f"{prefix}{sep1}{middle}{sep2}{MASK * 4}"


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


def _mask_name(match: re.Match[str]) -> str:
    label, sep, first, rest = match.groups()
    if len(rest) == 1:
        return f"{label}{sep}{first}{MASK}"
    return f"{label}{sep}{first}{MASK * (len(rest) - 1)}{rest[-1]}"


def _mask_account_id(match: re.Match[str]) -> str:
    label, sep, value = match.groups()
    return f"{label}{sep}{value[:2]}{MASK * (len(value) - 2)}"


def _mask_passport_number(match: re.Match[str]) -> str:
    return f"{match.group(1)}{MASK * 4}"


def _mask_driver_license(match: re.Match[str]) -> str:
    return f"{match.group(1)}{match.group(2)}{MASK * 6}-{MASK * 2}"


def _mask_digits(match: re.Match[str]) -> str:
    return "".join(MASK if char.isdigit() else char for char in match.group(0))


# 이메일 먼저 (이메일 속 숫자 오탐 방지), 계좌는 마지막 (나머지 번호 형식 제외 후)
def mask_pii(text: str) -> str:
    text = _EMAIL.sub(_mask_email, text)
    text = _NAME.sub(_mask_name, text)
    text = _ACCOUNT_ID.sub(_mask_account_id, text)
    text = _PASSPORT_NUMBER.sub(_mask_passport_number, text)
    text = _DRIVER_LICENSE.sub(_mask_driver_license, text)
    text = _RESIDENT_NUMBER.sub(_mask_resident_number, text)
    text = _CARD_NUMBER.sub(_mask_card_number, text)
    text = _AMEX_CARD_NUMBER.sub(_mask_amex_card_number, text)
    text = _PHONE_NUMBER.sub(_mask_phone_number, text)
    text = _ROAD_ADDRESS.sub(_mask_digits, text)
    text = _LOT_ADDRESS.sub(_mask_digits, text)
    text = _BUILDING_UNIT.sub(_mask_digits, text)
    return _ACCOUNT_NUMBER.sub(_mask_account_number, text)
