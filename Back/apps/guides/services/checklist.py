from django.db.models import Model


def get_progress(user: Model) -> list[dict[str, object]]:
    raise NotImplementedError
