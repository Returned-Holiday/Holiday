import datetime

from apps.incidents.models import Company, Incident


def make_incident(company: Company, **fields: object) -> Incident:
    values = {
        "company": company,
        "notified_at": datetime.date(2026, 10, 1),
        "summary": "요약",
        "source_url": "https://example.com/notice",
    }
    values.update(fields)
    return Incident.objects.create(**values)
