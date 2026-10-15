from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email: str, password: str | None, **extra_fields: object) -> "User":
        if not email:
            raise ValueError("email is required")
        # 이메일 소문자 저장 (대소문자 중복 가입 방지)
        user = self.model(email=email.strip().lower(), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email: str, password: str | None = None, **extra_fields: object) -> "User":
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email: str, password: str | None = None, **extra_fields: object) -> "User":
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self._create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(max_length=254, unique=True)
    nickname = models.CharField(max_length=20)
    password_changed_at = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"
    REQUIRED_FIELDS = ["nickname"]

    class Meta:
        db_table = "users"


class PasswordHistory(models.Model):
    # 탈퇴 시 함께 삭제
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_histories")
    # 해시만 저장 (평문 X)
    password = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "password_histories"
        indexes = [models.Index(fields=["user", "created_at"], name="ix_pwhist_user_created")]
