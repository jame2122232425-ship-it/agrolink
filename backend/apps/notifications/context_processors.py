from apps.notifications.models import Notification
from apps.reports.permissions import HANDLER_ROLES, is_active_account, is_report_coordinator


def staff_notification_count(request):
    user = request.user
    has_dashboard_access = is_active_account(user) and (
        user.role in HANDLER_ROLES or is_report_coordinator(user)
    )
    if not has_dashboard_access:
        return {"staff_unread_notification_count": 0}
    return {
        "staff_unread_notification_count": Notification.objects.filter(
            recipient=user,
            read_at__isnull=True,
        ).count()
    }
