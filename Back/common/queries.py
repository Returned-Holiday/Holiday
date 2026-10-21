from typing import TypeVar

from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import AnonymousUser
from django.db.models import Model, QuerySet
from django.shortcuts import get_object_or_404

ModelT = TypeVar("ModelT", bound=Model)


# 소유자 조건 먼저 고정 → lookup으로 덮어쓰기 X (IDOR X), 비로그인은 빈 결과
def filter_owned(
    queryset: QuerySet[ModelT], user: AbstractBaseUser | AnonymousUser, *, owner_field: str = "user"
) -> QuerySet[ModelT]:
    if not user.is_authenticated:
        return queryset.none()
    return queryset.filter(**{owner_field: user})


# 없음·남의 것 모두 404 (존재 여부 숨김)
def get_owned_or_404(
    queryset: QuerySet[ModelT],
    user: AbstractBaseUser | AnonymousUser,
    *,
    owner_field: str = "user",
    **lookup: object,
) -> ModelT:
    return get_object_or_404(filter_owned(queryset, user, owner_field=owner_field), **lookup)
