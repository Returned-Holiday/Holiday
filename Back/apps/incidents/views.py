from django.db.models import Count, QuerySet
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.incidents.constants import IncidentStatus
from apps.incidents.models import Company, Incident, IncidentLeakItem
from apps.incidents.serializers import (
    AdminIncidentInputSerializer,
    AdminIncidentListSerializer,
    AdminIncidentQuerySerializer,
    AdminIncidentSerializer,
    AdminIncidentUpdateSerializer,
    CompanyInputSerializer,
    CompanySerializer,
    IncidentDetailSerializer,
    IncidentListSerializer,
    IncidentSearchQuerySerializer,
    LeakItemInputSerializer,
)
from apps.incidents.services import (
    add_leak_item,
    delete_leak_item,
    filter_by_company_query,
    get_public_incidents,
    save_company_for_api,
    search_public_incidents,
    update_leak_item,
    with_active_count,
    with_admin_leak_items,
    with_company_and_leak_items,
)
from common.audit import set_audit_action
from common.permissions import IsStaffWithOtp

class IncidentListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    throttle_scope = "search"
    serializer_class = IncidentListSerializer

    def get_queryset(self) -> QuerySet[Incident]:
        query = IncidentSearchQuerySerializer(data=self.request.query_params)
        query.is_valid(raise_exception=True)
        incidents = search_public_incidents(query.validated_data["q"])
        return with_company_and_leak_items(incidents).order_by("-notified_at", "-id")


class IncidentDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = IncidentDetailSerializer

    def get_queryset(self) -> QuerySet[Incident]:
        return with_active_count(with_company_and_leak_items(get_public_incidents()))


def _admin_incident_data(incident_id: int) -> dict:
    incident = get_object_or_404(with_admin_leak_items(Incident.objects.all()), pk=incident_id)
    return AdminIncidentSerializer(incident).data


class AdminCompanyListView(generics.ListCreateAPIView):
    permission_classes = [IsStaffWithOtp]
    throttle_scope = "admin"
    serializer_class = CompanySerializer

    def get_queryset(self) -> QuerySet[Company]:
        return Company.objects.order_by("name")

    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        serializer = CompanyInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        company = save_company_for_api(Company(**serializer.validated_data))
        return Response(CompanySerializer(company).data, status=status.HTTP_201_CREATED)


class AdminCompanyDetailView(APIView):
    permission_classes = [IsStaffWithOtp]
    throttle_scope = "admin"

    def patch(self, request: Request, pk: int) -> Response:
        company = get_object_or_404(Company, pk=pk)
        serializer = CompanyInputSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(company, field, value)
        return Response(CompanySerializer(save_company_for_api(company)).data)


class AdminIncidentListView(generics.ListCreateAPIView):
    permission_classes = [IsStaffWithOtp]
    throttle_scope = "admin"
    serializer_class = AdminIncidentListSerializer

    def get_queryset(self) -> QuerySet[Incident]:
        query = AdminIncidentQuerySerializer(data=self.request.query_params)
        query.is_valid(raise_exception=True)
        incidents = filter_by_company_query(Incident.objects.all(), query.validated_data["q"])
        if "status" in query.validated_data:
            incidents = incidents.filter(status=query.validated_data["status"])
        return (
            incidents.select_related("company")
            .annotate(leak_item_count=Count("leak_items"))
            .order_by("-notified_at", "-id")
        )

    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        serializer = AdminIncidentInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # 신규는 비공개 고정 (요청 값 무시)
        incident = serializer.save(status=IncidentStatus.PRIVATE)
        return Response(_admin_incident_data(incident.pk), status=status.HTTP_201_CREATED)


class AdminIncidentDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsStaffWithOtp]
    throttle_scope = "admin"
    serializer_class = AdminIncidentSerializer
    # PUT·DELETE X (사고는 삭제 대신 비공개)
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self) -> QuerySet[Incident]:
        return with_admin_leak_items(Incident.objects.all())

    def update(self, request: Request, *args: object, **kwargs: object) -> Response:
        incident = self.get_object()
        serializer = AdminIncidentUpdateSerializer(incident, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        new_status = serializer.validated_data.get("status", incident.status)
        if new_status != incident.status:
            set_audit_action(request, "PUBLISH" if new_status == IncidentStatus.PUBLIC else "UNPUBLISH")
        serializer.save()
        return Response(_admin_incident_data(incident.pk))


class AdminLeakItemListView(APIView):
    permission_classes = [IsStaffWithOtp]
    throttle_scope = "admin"

    def post(self, request: Request, pk: int) -> Response:
        incident = get_object_or_404(Incident, pk=pk)
        serializer = LeakItemInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        add_leak_item(incident, serializer.validated_data)
        return Response(_admin_incident_data(incident.pk), status=status.HTTP_201_CREATED)


class AdminLeakItemDetailView(APIView):
    permission_classes = [IsStaffWithOtp]
    throttle_scope = "admin"

    # 다른 사고 소속 항목 → 404
    def get_item(self, pk: int, item_id: int) -> IncidentLeakItem:
        return get_object_or_404(IncidentLeakItem, pk=item_id, incident_id=pk)

    def patch(self, request: Request, pk: int, item_id: int) -> Response:
        item = self.get_item(pk, item_id)
        serializer = LeakItemInputSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        update_leak_item(item, serializer.validated_data)
        return Response(_admin_incident_data(pk))

    def delete(self, request: Request, pk: int, item_id: int) -> Response:
        delete_leak_item(self.get_item(pk, item_id))
        return Response(status=status.HTTP_204_NO_CONTENT)
