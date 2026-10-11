from django.urls import include, path

# 비회원에게 열 경로는 각 앱의 뷰에서 명시적으로 연다. 기본은 로그인 필요다
urlpatterns = [
    path("api/auth/", include("apps.accounts.urls")),
    path("api/incidents/", include("apps.incidents.urls")),
    path("api/guides/", include("apps.guides.urls")),
    path("api/reports/", include("apps.reports.urls")),
    path("api/mypage/", include("apps.mypage.urls")),
    path("api/admin/accounts/", include("apps.accounts.admin_urls")),
    path("api/admin/incidents/", include("apps.incidents.admin_urls")),
    path("api/admin/guides/", include("apps.guides.admin_urls")),
    path("api/admin/reports/", include("apps.reports.admin_urls")),
]

handler404 = "config.errors.not_found"
handler500 = "config.errors.server_error"
