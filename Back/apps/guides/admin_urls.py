from django.urls import path

from apps.guides.views import AdminActionDetailView, AdminActionListView

urlpatterns = [
    path("actions/", AdminActionListView.as_view()),
    path("actions/<int:pk>/", AdminActionDetailView.as_view()),
]
