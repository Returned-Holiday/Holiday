from django.urls import path

from apps.mypage.views import MypageView

urlpatterns = [
    path("", MypageView.as_view()),
]
