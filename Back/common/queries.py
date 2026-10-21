from django.db.models import Model, QuerySet
from django.shortcuts import get_object_or_404


# 요청자 것만, 남의 것·없음 모두 404 (IDOR 방지)
def get_owned_or_404(queryset: QuerySet, user: Model, **lookup: object) -> Model:
    return get_object_or_404(queryset.filter(user=user), **lookup)
