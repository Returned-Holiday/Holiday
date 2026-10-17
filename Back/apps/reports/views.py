from django.db.models import QuerySet
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import BaseThrottle
from rest_framework.views import APIView

from apps.reports.models import Report
from apps.reports.serializers import (
    AdminReportDetailSerializer,
    AdminReportListSerializer,
    AdminReportQuerySerializer,
    ApproveInputSerializer,
    MyReportSerializer,
    RejectInputSerializer,
    ReportInputSerializer,
)
from apps.reports.services import approve_report, create_report, get_my_reports, reject_report
from common.audit import set_audit_action
from common.permissions import IsStaffWithOtp


# 상세 API X, 목록도 request.user 것만 (IDOR X)
class MyReportListView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MyReportSerializer

    # 등록만 하루 5건 제한
    def get_throttles(self) -> list[BaseThrottle]:
        self.throttle_scope = "report" if self.request.method == "POST" else ""
        return super().get_throttles()

    def get_queryset(self) -> QuerySet[Report]:
        return get_my_reports(self.request.user)

    def create(self, request: Request, *args: object, **kwargs: object) -> Response:
        serializer = ReportInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = create_report(request.user, serializer.validated_data)
        return Response({"id": report.pk}, status=status.HTTP_201_CREATED)


def _admin_reports() -> QuerySet[Report]:
    return Report.objects.select_related("reporter").order_by("-created_at", "-id")


def _admin_report_data(report_id: int) -> dict:
    return AdminReportDetailSerializer(get_object_or_404(_admin_reports(), pk=report_id)).data


class AdminReportListView(generics.ListAPIView):
    permission_classes = [IsStaffWithOtp]
    throttle_scope = "admin"
    serializer_class = AdminReportListSerializer

    def get_queryset(self) -> QuerySet[Report]:
        query = AdminReportQuerySerializer(data=self.request.query_params)
        query.is_valid(raise_exception=True)
        reports = _admin_reports()
        if "status" in query.validated_data:
            reports = reports.filter(status=query.validated_data["status"])
        return reports


class AdminReportDetailView(generics.RetrieveAPIView):
    permission_classes = [IsStaffWithOtp]
    throttle_scope = "admin"
    serializer_class = AdminReportDetailSerializer

    def get_queryset(self) -> QuerySet[Report]:
        return _admin_reports()


class AdminReportApproveView(APIView):
    permission_classes = [IsStaffWithOtp]
    throttle_scope = "admin"

    def post(self, request: Request, pk: int) -> Response:
        get_object_or_404(Report, pk=pk)
        serializer = ApproveInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        set_audit_action(request, "APPROVE")
        approve_report(pk, request.user, serializer.validated_data.get("incident_id"))
        return Response(_admin_report_data(pk))


class AdminReportRejectView(APIView):
    permission_classes = [IsStaffWithOtp]
    throttle_scope = "admin"

    def post(self, request: Request, pk: int) -> Response:
        get_object_or_404(Report, pk=pk)
        serializer = RejectInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        set_audit_action(request, "REJECT")
        reject_report(pk, request.user, serializer.validated_data["reason"])
        return Response(_admin_report_data(pk))
