from django.urls import path
from django.views.generic import RedirectView
from django.views.generic import TemplateView

from apps.platform_admin import views


app_name = "platform"

urlpatterns = [
    path("", RedirectView.as_view(pattern_name="platform:dashboard", permanent=False)),
    path(
        "login/",
        RedirectView.as_view(
            url="/staff/login/?next=/platform/dashboard/",
            permanent=False,
        ),
        name="login",
    ),
    path("dashboard/", views.platform_dashboard, name="dashboard"),
    path("farms/", views.farm_overview, name="farms"),
    path("crops/", views.crop_overview, name="crops"),
    path("livestock/", views.livestock_overview, name="livestock"),
    path("reports/", views.report_overview, name="reports"),
    path(
        "password-reset/complete/",
        TemplateView.as_view(template_name="platform/password_reset_complete.html"),
        name="password-reset-complete",
    ),
    path("users/farmers/", views.user_directory, {"category": "farmers"}, name="farmers"),
    path("users/staff/", views.user_directory, {"category": "staff"}, name="staff"),
    path(
        "users/professionals/",
        views.user_directory,
        {"category": "professionals"},
        name="professionals",
    ),
    path("users/staff/create/", views.staff_create, name="staff-create"),
    path(
        "users/staff/<int:user_id>/permissions/",
        views.staff_permissions_update,
        name="staff-permissions",
    ),
    path(
        "users/staff/<int:user_id>/roles/",
        views.user_roles_update,
        {"category": "staff"},
        name="user-roles",
    ),
    path("access/roles/", views.roles, name="roles"),
    path("access/roles/create/", views.role_create, name="role-create"),
    path("access/roles/<int:role_id>/", views.role_detail, name="role-detail"),
    path(
        "access/roles/<int:role_id>/update/",
        views.role_update,
        name="role-update",
    ),
    path(
        "access/roles/<int:role_id>/permissions/",
        views.role_permissions_update,
        name="role-permissions",
    ),
    path(
        "access/roles/<int:role_id>/members/",
        views.role_members_update,
        name="role-members",
    ),
    path(
        "access/roles/<int:role_id>/delete/",
        views.role_delete,
        name="role-delete",
    ),
    path(
        "users/<str:category>/<int:user_id>/password-reset/",
        views.account_password_reset,
        name="account-password-reset",
    ),
    path(
        "reference-data/",
        views.reference_data,
        name="reference-data",
    ),
    path(
        "reference-data/create/",
        views.reference_data_create,
        name="reference-data-create",
    ),
    path(
        "reference-data/<int:stage_id>/",
        views.reference_data_update,
        name="reference-data-update",
    ),
    path(
        "users/<str:category>/<int:user_id>/",
        views.user_detail,
        name="user-detail",
    ),
    path(
        "users/<str:category>/<int:user_id>/status/",
        views.account_status_update,
        name="account-status",
    ),
    path("audit-logs/", views.audit_log, name="audit-log"),
    path("community/", views.community_moderation, name="community-moderation"),
]
