from django.db.models import Model, QuerySet


def get_owned_or_404(queryset: QuerySet, user: Model, **lookup: object) -> Model:
    raise NotImplementedError
