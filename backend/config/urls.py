from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.auth.views import PasswordResetConfirmView
from django.urls import include, path
from django.urls import reverse_lazy
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.accounts.views import (
    AccountTokenRefreshView,
    MeView,
    LogoutView,
    RegisterView,
)
from apps.common.views import HealthView, LandingPageView, PrivateImageView


urlpatterns = [
    path("", LandingPageView.as_view(), name="home"),
    path("admin/", admin.site.urls),
    path("api/v1/health/", HealthView.as_view(), name="health"),
    path("health", HealthView.as_view(), name="health-check"),
    path("api/v1/auth/register/", RegisterView.as_view(), name="register"),
    path("api/v1/auth/login/", TokenObtainPairView.as_view(), name="login"),
    path("api/v1/auth/logout/", LogoutView.as_view(), name="logout"),
    path("api/v1/auth/refresh/", AccountTokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/auth/me/", MeView.as_view(), name="me"),
    path("api/v1/farmer/profile/", MeView.as_view(), name="farmer-profile"),
    path("api/v1/ai/", include("apps.ai_assistant.urls")),
    path("api/v1/", include("apps.farms.urls")),
    path("api/v1/", include("apps.crops.urls")),
    path("api/v1/", include("apps.livestock.urls")),
    path("api/v1/", include("apps.reports.urls")),
    path("api/v1/community/", include("apps.community.urls")),
    path("api/v1/", include("apps.notifications.urls")),
    path("api/v1/market/", include("apps.market_intelligence.urls")),
    path(
        "platform/reset/<uidb64>/<token>/",
        PasswordResetConfirmView.as_view(
            template_name="platform/password_reset_confirm.html",
            success_url=reverse_lazy("platform:password-reset-complete"),
        ),
        name="password_reset_confirm",
    ),
    path("platform/", include("apps.platform_admin.urls")),
    path("staff/", include("apps.reports.dashboard_urls")),
    path(
        "api/v1/private-images/<str:resource>/<int:pk>/",
        PrivateImageView.as_view(),
        name="private-image",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
