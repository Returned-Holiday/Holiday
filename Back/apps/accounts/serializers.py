from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import RegexValidator
from rest_framework import serializers

from common.passwords import is_password_expired

from .constants import (
    EMAIL_MAX_LENGTH,
    NICKNAME_MAX_LENGTH,
    NICKNAME_PATTERN,
    OTP_CODE_PATTERN,
    PASSWORD_INPUT_MAX_LENGTH,
)
from .models import User

AGREEMENT_FIELDS = ("agree_terms", "agree_privacy", "confirm_age")


class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=EMAIL_MAX_LENGTH)
    # 공백도 비밀번호 일부 (trim X)
    password = serializers.CharField(max_length=PASSWORD_INPUT_MAX_LENGTH, trim_whitespace=False, write_only=True)
    nickname = serializers.CharField(
        max_length=NICKNAME_MAX_LENGTH,
        validators=[RegexValidator(NICKNAME_PATTERN, message="닉네임은 한글·영문·숫자 2~20자로 입력해 주세요.")],
    )
    agree_terms = serializers.BooleanField()
    agree_privacy = serializers.BooleanField()
    confirm_age = serializers.BooleanField()

    def validate_email(self, value: str) -> str:
        return User.objects.normalize_login_email(value)

    def validate(self, attrs: dict) -> dict:
        missing = {name: ["필수 항목에 동의해 주세요."] for name in AGREEMENT_FIELDS if not attrs[name]}
        if missing:
            raise serializers.ValidationError(missing)
        candidate = User(email=attrs["email"], nickname=attrs["nickname"])
        try:
            validate_password(attrs["password"], candidate)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"password": list(error.messages)}) from error
        return attrs


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=EMAIL_MAX_LENGTH)
    password = serializers.CharField(max_length=PASSWORD_INPUT_MAX_LENGTH, trim_whitespace=False, write_only=True)

    # axes 실패 횟수도 정규화한 이메일 기준 (대소문자 변형 잠금 우회 X)
    def validate_email(self, value: str) -> str:
        return User.objects.normalize_login_email(value)


class MeSerializer(serializers.ModelSerializer):
    password_expired = serializers.SerializerMethodField()
    otp_verified = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("nickname", "email", "password_changed_at", "password_expired", "is_staff", "otp_verified")
        read_only_fields = fields

    def get_password_expired(self, user: User) -> bool:
        return is_password_expired(user)

    # OTP 미들웨어가 붙인 is_verified, 비관리자는 항상 False
    def get_otp_verified(self, user: User) -> bool:
        return bool(user.is_staff and user.is_verified())


class OtpSerializer(serializers.Serializer):
    code = serializers.RegexField(OTP_CODE_PATTERN, max_length=6)


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(max_length=PASSWORD_INPUT_MAX_LENGTH, trim_whitespace=False, write_only=True)
    new_password = serializers.CharField(max_length=PASSWORD_INPUT_MAX_LENGTH, trim_whitespace=False, write_only=True)


class WithdrawSerializer(serializers.Serializer):
    current_password = serializers.CharField(max_length=PASSWORD_INPUT_MAX_LENGTH, trim_whitespace=False, write_only=True)
