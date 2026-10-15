import json

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, APISimpleTestCase
from rest_framework.views import APIView


class _ItemView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        return Response({"id": 1})


class _EmptyView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        return Response(None)

    def delete(self, request: Request) -> Response:
        return Response(status=status.HTTP_204_NO_CONTENT)


class _InvalidView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        raise ValidationError({"email": ["invalid"]})


class _ListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        paginator = PageNumberPagination()
        page = paginator.paginate_queryset([1, 2, 3], request, view=self)
        return paginator.get_paginated_response(page)


class DataEnvelopeRendererTests(APISimpleTestCase):
    factory = APIRequestFactory()

    def render(self, view: type[APIView], method: str = "get") -> Response:
        response = view.as_view()(getattr(self.factory, method)("/"))
        response.render()
        return response

    def test_wraps_success(self) -> None:
        self.assertJSONEqual(self.render(_ItemView).content, {"data": {"id": 1}})

    def test_wraps_none_as_null(self) -> None:
        self.assertJSONEqual(self.render(_EmptyView).content, {"data": None})

    def test_no_body_on_204(self) -> None:
        self.assertEqual(self.render(_EmptyView, "delete").content, b"")

    def test_error_not_wrapped(self) -> None:
        response = self.render(_InvalidView, "post")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        body = json.loads(response.content)
        self.assertNotIn("data", body)
        self.assertEqual(body["code"], "VALIDATION_ERROR")

    def test_wraps_paginated_list(self) -> None:
        body = json.loads(self.render(_ListView).content)
        self.assertEqual(body["data"]["count"], 3)
        self.assertEqual(body["data"]["results"], [1, 2, 3])
