from django.db.models import Q
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.accounts.models import User
from apps.notifications.models import Notification
from apps.notifications.services import create_notification
from apps.reports.models import AgriculturalReport, ReportEvent, ReportUpdate
from apps.reports.permissions import HANDLER_ROLES, is_report_coordinator


def _case_coordinators():
    candidates = User.objects.filter(
        is_active=True,
        account_status=User.AccountStatus.ACTIVE,
    ).filter(
        Q(is_superuser=True)
        | Q(role=User.Role.PLATFORM_ADMIN)
        | Q(groups__permissions__codename="coordinate_cases")
    ).distinct()
    return [user for user in candidates if is_report_coordinator(user)]


def _notify_farmer(report, event_key, title, message):
    create_notification(
        recipient=report.farmer,
        event_key=event_key,
        notification_type=Notification.Type.REPORT,
        title=title,
        message=message,
        action_url=f"/report-problem?tab=history&report={report.pk}",
    )


@receiver(post_save, sender=ReportEvent)
def notify_report_event(sender, instance, created, **kwargs):
    if not created:
        return

    report = instance.report
    details = instance.details or {}
    event_key = f"report-event:{instance.pk}"

    if instance.event_type == ReportEvent.EventType.SUBMITTED:
        for coordinator in _case_coordinators():
            create_notification(
                recipient=coordinator,
                event_key=f"{event_key}:coordinator:{coordinator.pk}",
                notification_type=Notification.Type.REPORT,
                severity=(
                    Notification.Severity.DANGER
                    if report.severity == AgriculturalReport.Severity.CRITICAL
                    else Notification.Severity.WARNING
                    if report.severity == AgriculturalReport.Severity.HIGH
                    else Notification.Severity.INFO
                ),
                title=f"New farmer report: {report.title}",
                message=f"{report.report_reference} was submitted for review.",
                action_url="/staff/unassigned/",
            )
        return

    if instance.event_type in {
        ReportEvent.EventType.ASSIGNED,
        ReportEvent.EventType.REASSIGNED,
    }:
        assigned_user_id = details.get("assigned_user_id")
        if assigned_user_id:
            assigned_user = User.objects.filter(
                pk=assigned_user_id,
                is_active=True,
                account_status=User.AccountStatus.ACTIVE,
                role__in=HANDLER_ROLES,
            ).first()
            if assigned_user:
                create_notification(
                    recipient=assigned_user,
                    event_key=f"{event_key}:handler:{assigned_user.pk}",
                    notification_type=Notification.Type.REPORT,
                    title=f"Case assigned: {report.title}",
                    message=f"{report.report_reference} is now assigned to you.",
                    action_url=f"/staff/cases/{report.pk}/",
                )
        _notify_farmer(
            report,
            f"{event_key}:farmer",
            "Your report has been assigned",
            f"{report.report_reference} has been assigned to a case handler.",
        )
        return

    if instance.event_type == ReportEvent.EventType.STATUS_CHANGED:
        new_status = details.get("to")
        if new_status not in {
            AgriculturalReport.Status.ASSIGNED,
            AgriculturalReport.Status.AWAITING_FARMER,
            AgriculturalReport.Status.RESOLVED,
        }:
            status_label = dict(AgriculturalReport.Status.choices).get(
                new_status, "updated"
            )
            _notify_farmer(
                report,
                f"{event_key}:farmer",
                "Your report status changed",
                f"{report.report_reference} is now {status_label.lower()}.",
            )
        return

    if instance.event_type == ReportEvent.EventType.REOPENED:
        _notify_farmer(
            report,
            f"{event_key}:farmer",
            "Your report has been reopened",
            f"{report.report_reference} is back under review.",
        )
        return

    if instance.event_type != ReportEvent.EventType.UPDATE_CREATED:
        return

    update_id = details.get("update_id")
    update = ReportUpdate.objects.filter(pk=update_id, report=report).first()
    if update is None:
        return

    if (
        update.update_type == ReportUpdate.UpdateType.FARMER_CLARIFICATION
        and instance.actor_id == report.farmer_id
    ):
        active_handlers = User.objects.filter(
            case_assignments__report=report,
            case_assignments__is_active=True,
            role__in=HANDLER_ROLES,
            is_active=True,
            account_status=User.AccountStatus.ACTIVE,
        ).distinct()
        for handler in active_handlers:
            create_notification(
                recipient=handler,
                event_key=f"{event_key}:handler:{handler.pk}",
                notification_type=Notification.Type.REPORT,
                title=f"Farmer replied: {report.title}",
                message=f"{report.report_reference} has new information from the farmer.",
                action_url=f"/staff/cases/{report.pk}/",
            )
        return

    if update.visible_to_farmer and update.author_id != report.farmer_id:
        _notify_farmer(
            report,
            f"{event_key}:farmer",
            f"New case update: {report.title}",
            update.message,
        )
