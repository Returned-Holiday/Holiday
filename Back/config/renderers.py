from rest_framework import status
from rest_framework.renderers import JSONRenderer


# 2xx만 {"data": ...}, 에러는 공통 형식 그대로
class DataEnvelopeJSONRenderer(JSONRenderer):
    def render(self, data: object, accepted_media_type: str | None = None, renderer_context: dict | None = None) -> bytes:
        response = (renderer_context or {}).get("response")
        if response is not None and status.is_success(response.status_code) and response.status_code != status.HTTP_204_NO_CONTENT:
            data = {"data": data}
        return super().render(data, accepted_media_type, renderer_context)
