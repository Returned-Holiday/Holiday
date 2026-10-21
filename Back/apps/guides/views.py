from django.db.models import QuerySet
from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.guides.constants import PublishStatus
from apps.guides.models import Action, ActionCompletion
from apps.guides.serializers import (
    AdminActionInputSerializer,
    AdminActionQuerySerializer,
    AdminActionSerializer,
    ChecklistSerializer,
    SurveyInputSerializer,
    SurveyOutputSerializer,
)
from apps.guides.services.actions import admin_actions, create_action, update_action
from apps.guides.services.checklist import build_checklist, get_completable_action_or_404, get_response_or_404
from apps.guides.services.survey import (
    delete_survey,
    find_response,
    get_incident_for_user_or_404,
    leaked_item_ids,
    save_survey,
    to_answers,
)
from common.audit import set_audit_action
from common.permissions import IsStaffWithOtp
from common.queries import filter_owned


# 내 응답만 (URL에 소유자 ID X, request.user로)
class SurveyView(APIView):
    permission_classes = [IsAuthenticated]

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
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, pk: int) -> Response:
        incident = get_incident_for_user_or_404(pk)
        response = get_response_or_404(request.user, incident)
        return Response(ChecklistSerializer(build_checklist(request.user, incident, response)).data)


class CompletionView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request: Request, pk: int, action_id: int) -> Response:
        incident = get_incident_for_user_or_404(pk)
        action = get_completable_action_or_404(request.user, incident, action_id)
        # 유일 제약 + get_or_create (중복 요청도 한 행)
        ActionCompletion.objects.get_or_create(user=request.user, incident=incident, action=action)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request: Request, pk: int, action_id: int) -> Response:
        incident = get_incident_for_user_or_404(pk)
        action = get_completable_action_or_404(request.user, incident, action_id)
        filter_owned(ActionCompletion.objects.all(), request.user).filter(incident=incident, action=action).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminActionListView(generics.ListCreateAPIView):
    permission_classes = [IsStaffWithOtp]
    throttle_scope = "admin"
    serializer_class = AdminActionSerializer

    def get_queryset(self) -> QuerySet[Action]:
        query = AdminActionQuerySerializer(data=self.request.query_params)
        query.is_valid(raise_exception=True)
        return admin_actions(query.validated_data.get("status"), query.validated_data.get("incident_id"))

    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        serializer = AdminActionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        action = create_action(serializer.validated_data)
        return Response(AdminActionSerializer(action).data, status=status.HTTP_201_CREATED)


class AdminActionDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsStaffWithOtp]
    throttle_scope = "admin"
    serializer_class = AdminActionSerializer
    queryset = Action.objects.all()
    # PUT·DELETE X (조치는 삭제 대신 비공개)
    http_method_names = ["get", "patch", "head", "options"]

    def update(self, request: Request, *args: object, **kwargs: object) -> Response:
        action = self.get_object()
        serializer = AdminActionInputSerializer(action, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data.get("status", action.status)
        if new_status != action.status:
            set_audit_action(request, "PUBLISH" if new_status == PublishStatus.PUBLIC else "UNPUBLISH")
        return Response(AdminActionSerializer(update_action(action, serializer.validated_data)).data)
