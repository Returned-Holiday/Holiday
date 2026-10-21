from django.http import JsonResponse


def error_body(code: str, message: str, fields: object = None) -> dict[str, object]:
    body: dict[str, object] = {"code": code, "message": message}
    if fields is not None:
        body["fields"] = fields
    return body


# DRF 밖(미들웨어·핸들러) 에러도 같은 형식
def error_json(code: str, message: str, status_code: int) -> JsonResponse:
    return JsonResponse(error_body(code, message), status=status_code)
