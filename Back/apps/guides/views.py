from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.guides.models import ActionCompletion
from apps.guides.serializers import ChecklistSerializer, SurveyInputSerializer, SurveyOutputSerializer
from apps.guides.services.checklist import build_checklist, get_completable_action_or_404, get_response_or_404
from apps.guides.services.survey import (
    delete_survey,
    find_response,
    get_incident_for_user_or_404,
    leaked_item_ids,
    save_survey,
    to_answers,
)


# 내 응답만 (URL에 소유자 ID X, request.user로)
class SurveyView(APIView):
    # 삭제만 sensitive 제한
    @property
    def throttle_scope(self) -> str | None:
        return "sensitive" if self.request.method == "DELETE" else None

    def get(self, request: Request, pk: int) -> Response:
        incident = get_incident_for_user_or_404(pk)
        response = find_response(request.user, incident)
        return Response(SurveyOutputSerializer(to_answers(response)).data if response else None)

    def put(self, request: Request, pk: int) -> Response:
        incident = get_incident_for_user_or_404(pk)
        serializer = SurveyInputSerializer(data=request.data, context={"leaked_item_ids": leaked_item_ids(incident)})
        serializer.is_valid(raise_exception=True)
        save_survey(request.user, incident, serializer.validated_data)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request: Request, pk: int) -> Response:
        if not delete_survey(request.user, pk):
            raise NotFound
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChecklistView(APIView):
    def get(self, request: Request, pk: int) -> Response:
        incident = get_incident_for_user_or_404(pk)
        response = get_response_or_404(request.user, incident)
        return Response(ChecklistSerializer(build_checklist(request.user, incident, response)).data)


class CompletionView(APIView):
    def put(self, request: Request, pk: int, action_id: int) -> Response:
        incident = get_incident_for_user_or_404(pk)
        action = get_completable_action_or_404(request.user, incident, action_id)
        # 유일 제약 + get_or_create (중복 요청도 한 행)
        ActionCompletion.objects.get_or_create(user=request.user, incident=incident, action=action)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request: Request, pk: int, action_id: int) -> Response:
        incident = get_incident_for_user_or_404(pk)
        action = get_completable_action_or_404(request.user, incident, action_id)
        ActionCompletion.objects.filter(user=request.user, incident=incident, action=action).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
