from django.urls import path

from apps.reports.views import (
    AdminReportApproveView,
    AdminReportDetailView,
    AdminReportListView,
    AdminReportRejectView,
)

urlpatterns = [
    path("", AdminReportListView.as_view()),
    path("<int:pk>/", AdminReportDetailView.as_view()),
    path("<int:pk>/approve/", AdminReportApproveView.as_view()),
    path("<int:pk>/reject/", AdminReportRejectView.as_view()),
]
