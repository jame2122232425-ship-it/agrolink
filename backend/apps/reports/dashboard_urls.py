from django.urls import path

from apps.notifications.dashboard_views import (
    mark_all_staff_notifications_read,
    mark_staff_notification_read,
    staff_notifications,
)
from apps.reports.dashboard_views import (
    StaffLoginView,
    StaffLogoutView,
    staff_case_assignments,
    staff_case_detail,
    staff_case_list,
    staff_case_reopen,
    staff_case_transition,
    staff_case_update,
    staff_dashboard,
    staff_officers,
    staff_unassigned_cases,
)


app_name = "staff"

urlpatterns = [
    path("login/", StaffLoginView.as_view(), name="login"),
    path("logout/", StaffLogoutView.as_view(), name="logout"),
    path("dashboard/", staff_dashboard, name="dashboard"),
    path("notifications/", staff_notifications, name="notifications"),
    path(
        "notifications/read-all/",
        mark_all_staff_notifications_read,
        name="notifications-read-all",
    ),
    path(
        "notifications/<int:notification_id>/read/",
        mark_staff_notification_read,
        name="notification-read",
    ),
    path("cases/", staff_case_list, name="cases"),
    path("cases/<int:report_id>/", staff_case_detail, name="case-detail"),
    path("cases/<int:report_id>/updates/", staff_case_update, name="case-update"),
    path(
        "cases/<int:report_id>/transition/",
        staff_case_transition,
        name="case-transition",
    ),
    path("cases/<int:report_id>/reopen/", staff_case_reopen, name="case-reopen"),
    path(
        "cases/<int:report_id>/assignments/",
        staff_case_assignments,
        name="case-assignments",
    ),
    path("unassigned/", staff_unassigned_cases, name="unassigned"),
    path("officers/", staff_officers, name="officers"),
]
