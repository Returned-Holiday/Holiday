from django.urls import path

from apps.incidents.views import (
    AdminCompanyDetailView,
    AdminCompanyListView,
    AdminIncidentDetailView,
    AdminIncidentListView,
    AdminLeakItemDetailView,
    AdminLeakItemListView,
)

urlpatterns = [
    path("", AdminIncidentListView.as_view()),
    path("<int:pk>/", AdminIncidentDetailView.as_view()),
    path("<int:pk>/leak-items/", AdminLeakItemListView.as_view()),
    path("<int:pk>/leak-items/<int:item_id>/", AdminLeakItemDetailView.as_view()),
    path("companies/", AdminCompanyListView.as_view()),
    path("companies/<int:pk>/", AdminCompanyDetailView.as_view()),
]
