from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.notifications.models import Notification


def create_notification(
    *,
    recipient,
    event_key,
    notification_type,
    title,
    message,
    action_url,
    severity=Notification.Severity.INFO,
):
    notification, _ = Notification.objects.get_or_create(
        recipient=recipient,
        event_key=event_key,
        defaults={
            "notification_type": notification_type,
            "severity": severity,
            "title": title,
            "message": message,
            "action_url": action_url,
        },
    )
    return notification


def _delete_stale_alerts(user, event_prefix, active_event_keys):
    stale_alerts = Notification.objects.filter(
        recipient=user,
        event_key__startswith=event_prefix,
    )
    if active_event_keys:
        stale_alerts = stale_alerts.exclude(event_key__in=active_event_keys)
    stale_alerts.delete()


@transaction.atomic
def sync_farm_alert_notifications(user):
    from apps.accounts.models import User
    from apps.crops.models import CropHealthObservation
    from apps.livestock.models import LivestockHealthObservation, LivestockMedicalRecord
    from apps.reports.models import AgriculturalReport

    if user.role != User.Role.FARMER:
        return

    open_reports = list(
        AgriculturalReport.objects.filter(
            farmer=user,
            status__in=[
                AgriculturalReport.Status.SUBMITTED,
                AgriculturalReport.Status.ASSIGNED,
                AgriculturalReport.Status.UNDER_REVIEW,
                AgriculturalReport.Status.AWAITING_FARMER,
            ],
        ).only("id", "report_reference", "title", "status")
    )
    open_report_keys = [f"open-report:{report.pk}" for report in open_reports]
    _delete_stale_alerts(user, "open-report:", open_report_keys)
    for report in open_reports:
        create_notification(
            recipient=user,
            event_key=f"open-report:{report.pk}",
            notification_type=Notification.Type.REPORT,
            severity=Notification.Severity.INFO,
            title=f"Report in progress: {report.title}",
            message=f"{report.report_reference} is still being reviewed.",
            action_url="/report-problem",
        )

    serious_levels = ["high", "critical"]
    crop_observations = list(
        CropHealthObservation.objects.filter(
            crop__farm__farmer=user,
        )
        .filter(Q(severity__in=serious_levels) | Q(general_condition="poor"))
        .select_related("crop")
    )
    crop_alert_keys = [
        f"crop-health:{observation.pk}" for observation in crop_observations
    ]
    _delete_stale_alerts(user, "crop-health:", crop_alert_keys)
    for observation in crop_observations:
        severity = (
            Notification.Severity.DANGER
            if observation.severity == "critical"
            else Notification.Severity.WARNING
        )
        create_notification(
            recipient=user,
            event_key=f"crop-health:{observation.pk}",
            notification_type=Notification.Type.CROP,
            severity=severity,
            title=f"Check {observation.crop.crop_name}",
            message=observation.symptoms_observed,
            action_url="/crops",
        )

    livestock_observations = list(
        LivestockHealthObservation.objects.filter(
            Q(animal__farm__farmer=user) | Q(group__farm__farmer=user)
        )
        .filter(Q(severity__in=serious_levels) | Q(general_condition="poor"))
        .select_related("animal", "group")
    )
    livestock_alert_keys = [
        f"livestock-health:{observation.pk}" for observation in livestock_observations
    ]
    _delete_stale_alerts(user, "livestock-health:", livestock_alert_keys)
    for observation in livestock_observations:
        subject = observation.animal or observation.group
        subject_name = (
            getattr(subject, "name_or_tag", None)
            or getattr(subject, "identification_number", None)
            or getattr(subject, "group_name", None)
            or "livestock"
        )
        severity = (
            Notification.Severity.DANGER
            if observation.severity == "critical"
            else Notification.Severity.WARNING
        )
        create_notification(
            recipient=user,
            event_key=f"livestock-health:{observation.pk}",
            notification_type=Notification.Type.LIVESTOCK,
            severity=severity,
            title=f"Check {subject_name}",
            message=observation.symptoms_reported,
            action_url="/livestock",
        )

    today = timezone.localdate()
    due_by = today + timedelta(days=14)
    vaccinations = list(
        LivestockMedicalRecord.objects.filter(
            record_type=LivestockMedicalRecord.RecordType.VACCINATION,
            next_scheduled_date__isnull=False,
            next_scheduled_date__lte=due_by,
        )
        .filter(Q(animal__farm__farmer=user) | Q(group__farm__farmer=user))
        .select_related("animal", "group")
    )
    vaccination_keys = [f"vaccination:{record.pk}" for record in vaccinations]
    _delete_stale_alerts(user, "vaccination:", vaccination_keys)
    for record in vaccinations:
        subject = record.animal or record.group
        subject_name = (
            getattr(subject, "name_or_tag", None)
            or getattr(subject, "identification_number", None)
            or getattr(subject, "group_name", None)
            or "livestock"
        )
        is_overdue = record.next_scheduled_date < today
        create_notification(
            recipient=user,
            event_key=f"vaccination:{record.pk}",
            notification_type=Notification.Type.REMINDER,
            severity=(
                Notification.Severity.DANGER
                if is_overdue
                else Notification.Severity.WARNING
            ),
            title=(
                f"Overdue vaccination for {subject_name}"
                if is_overdue
                else f"Vaccination due for {subject_name}"
            ),
            message=(
                f"{record.product_or_vaccine} was due "
                f"{record.next_scheduled_date.isoformat()}."
                if is_overdue
                else f"{record.product_or_vaccine} is due "
                f"{record.next_scheduled_date.isoformat()}."
            ),
            action_url="/livestock",
        )
