from apps.incidents.services import match_public_incident_text
from common.masking import mask_pii


# 인식 원문은 마스킹 후 매칭에만 (응답은 DB의 사고·항목만)
def match_notice(text: str) -> dict[str, object]:
    incident, items = match_public_incident_text(mask_pii(text))
    if incident is None:
        return {"incident": None, "matched_items": []}
    return {
        "incident": {"id": incident.pk, "company_name": incident.company.name},
        "matched_items": [{"id": item.pk, "label": item.label} for item in items],
    }
