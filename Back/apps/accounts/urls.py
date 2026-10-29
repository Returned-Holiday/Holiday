from django.urls import path

from .views import CsrfView, LoginView, LogoutView, MeView, OtpView, PasswordChangeView, SignupView, WithdrawView

urlpatterns = [
    path("csrf/", CsrfView.as_view()),
    path("signup/", SignupView.as_view()),
    path("login/", LoginView.as_view()),
    path("logout/", LogoutView.as_view()),
    path("me/", MeView.as_view()),
    path("otp/", OtpView.as_view()),
    path("password/", PasswordChangeView.as_view()),
    path("withdraw/", WithdrawView.as_view()),
]
