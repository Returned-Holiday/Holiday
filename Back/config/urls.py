from django.urls import include, path

# 기본 로그인 필요, 공개 경로는 뷰에서 명시
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
