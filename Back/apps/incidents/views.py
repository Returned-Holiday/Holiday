from django.db.models import QuerySet
from rest_framework import generics
from rest_framework.permissions import AllowAny

from apps.incidents.models import Incident
from apps.incidents.serializers import (
    IncidentDetailSerializer,
    IncidentListSerializer,
    IncidentSearchQuerySerializer,
)
from apps.incidents.services import get_public_incidents, search_public_incidents, with_company_and_leak_items


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
        return with_company_and_leak_items(get_public_incidents())
