from django.contrib import messages
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from apps.notifications.models import Notification
from apps.reports.dashboard_views import staff_access_required


@staff_access_required
def staff_notifications(request):
    notifications = Notification.objects.filter(recipient=request.user)
    return render(
        request,
        "staff/notifications.html",
        {"notifications": notifications},
    )


@staff_access_required
@require_POST
def mark_staff_notification_read(request, notification_id):
    notification = get_object_or_404(
        Notification,
        recipient=request.user,
        pk=notification_id,
    )
    if notification.read_at is None:
        notification.read_at = timezone.now()
        notification.save(update_fields=["read_at"])
    messages.success(request, "Notification marked as read.")
    return redirect("staff:notifications")


@staff_access_required
@require_POST
def mark_all_staff_notifications_read(request):
    Notification.objects.filter(
        recipient=request.user,
        read_at__isnull=True,
    ).update(read_at=timezone.now())
    messages.success(request, "All notifications marked as read.")
    return redirect("staff:notifications")
