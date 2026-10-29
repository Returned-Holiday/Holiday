from django.urls import path

from apps.guides.views import ChecklistView, CompletionView, OcrView, SurveyView

urlpatterns = [
    path("ocr/", OcrView.as_view()),
    path("incidents/<int:pk>/survey/", SurveyView.as_view()),
    path("incidents/<int:pk>/checklist/", ChecklistView.as_view()),
    path("incidents/<int:pk>/completions/<int:action_id>/", CompletionView.as_view()),
]
