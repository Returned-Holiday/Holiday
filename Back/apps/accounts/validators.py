import string

from django.core.exceptions import ValidationError

PASSWORD_MAX_LENGTH = 64
SEQUENCE_LENGTH = 4
KEYBOARD_ROWS = ("1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm")
EMAIL_ID_MIN_LENGTH = 3

RULE_MESSAGE = "영문 대·소문자, 숫자, 특수문자 중 2종류 이상 10자 이상 또는 3종류 이상 8자 이상으로 입력해 주세요."
MAX_LENGTH_MESSAGE = "비밀번호는 64자 이하로 입력해 주세요."
SEQUENCE_MESSAGE = "같은 문자 반복이나 1234·abcd·qwer 같은 연속 문자는 쓸 수 없습니다."
EMAIL_ID_MESSAGE = "비밀번호에 이메일 아이디를 포함할 수 없습니다."


def _char_class_count(password: str) -> int:
    classes = (
        any(c in string.ascii_uppercase for c in password),
        any(c in string.ascii_lowercase for c in password),
        any(c in string.digits for c in password),
        any(c in string.punctuation for c in password),
    )
    return sum(classes)


def _has_repeat(password: str) -> bool:
    return any(len(set(password[i : i + SEQUENCE_LENGTH])) == 1 for i in range(len(password) - SEQUENCE_LENGTH + 1))


def _is_step_sequence(chunk: str) -> bool:
    if not (chunk.isascii() and chunk.isalnum()):
        return False
    steps = {ord(b) - ord(a) for a, b in zip(chunk, chunk[1:])}
    return steps in ({1}, {-1})


def _has_sequence(password: str) -> bool:
    lowered = password.lower()
    for i in range(len(lowered) - SEQUENCE_LENGTH + 1):
        chunk = lowered[i : i + SEQUENCE_LENGTH]
        if _is_step_sequence(chunk):
            return True
        if any(chunk in row or chunk in row[::-1] for row in KEYBOARD_ROWS):
            return True
    return False


def _email_id(user: object) -> str:
    email = getattr(user, "email", "") or ""
    return email.split("@", 1)[0].lower()


# KISA 규칙 (docs/security.md 1), 메시지에 입력값 X
class KisaPasswordValidator:
    def validate(self, password: str, user: object = None) -> None:
        if len(password) > PASSWORD_MAX_LENGTH:
            raise ValidationError(MAX_LENGTH_MESSAGE, code="password_too_long")
        class_count = _char_class_count(password)
        if not ((class_count >= 2 and len(password) >= 10) or (class_count >= 3 and len(password) >= 8)):
            raise ValidationError(RULE_MESSAGE, code="password_rule")
        if _has_repeat(password) or _has_sequence(password):
            raise ValidationError(SEQUENCE_MESSAGE, code="password_sequence")
        email_id = _email_id(user)
        if len(email_id) >= EMAIL_ID_MIN_LENGTH and email_id in password.lower():
            raise ValidationError(EMAIL_ID_MESSAGE, code="password_contains_email")

    def get_help_text(self) -> str:
        return RULE_MESSAGE
