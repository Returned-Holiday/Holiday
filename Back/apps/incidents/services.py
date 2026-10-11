from django.db.models import Model, QuerySet


def get_public_incidents() -> QuerySet:
    raise NotImplementedError


def get_public_incident_or_404(incident_id: int) -> Model:
    raise NotImplementedError
