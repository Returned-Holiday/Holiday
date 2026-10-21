from django.urls import path

from apps.reports.views import MyReportListView

urlpatterns = [
    path("", MyReportListView.as_view()),
]
