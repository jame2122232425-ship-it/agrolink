from django.db import IntegrityError, transaction
from django.db.models import Q
from django.dispatch import Signal
from django.utils import timezone

from apps.accounts.models import User
from apps.reports.models import (
    AgriculturalReport,
    CaseAssignment,
    ReportEvent,
    ReportUpdate,
)
from apps.reports.permissions import (
    HANDLER_ROLES,
    is_report_coordinator,
    is_active_account,
)


class ReportWorkflowError(Exception):
    pass


class ReportAccessError(ReportWorkflowError):
    pass


report_event_published = Signal()


def _publish_after_commit(event_id):
    def publish():
        event = ReportEvent.objects.filter(pk=event_id).first()
        if event is not None:
            report_event_published.send_robust(
                sender=AgriculturalReport,
                report=event.report,
                event=event,
            )

    transaction.on_commit(publish, robust=True)


def record_event(report, actor, event_type, details=None):
    event = ReportEvent.objects.create(
        report=report,
        actor=actor,
        event_type=event_type,
        details=details or {},
    )
    _publish_after_commit(event.pk)
    return event


def is_assigned_handler(report, user):
    return bool(
        user
        and user.is_authenticated
        and user.is_active
        and user.account_status == User.AccountStatus.ACTIVE
        and user.role in allowed_handler_roles(report)
        and CaseAssignment.objects.filter(
            report=report,
            assigned_user=user,
            assignment_role=user.role,
            is_active=True,
        ).exists()
    )


def allowed_handler_roles(report):
    livestock_related = bool(
        report.category == AgriculturalReport.Category.LIVESTOCK_HEALTH
        or report.livestock_group_id
        or report.animal_id
    )
    crop_related = bool(
        report.category
        in {
            AgriculturalReport.Category.CROP_HEALTH,
            AgriculturalReport.Category.SOIL,
            AgriculturalReport.Category.WATER_IRRIGATION,
            AgriculturalReport.Category.WEATHER_CLIMATE,
            AgriculturalReport.Category.INFRASTRUCTURE,
        }
        or report.crop_id
    )
    if livestock_related:
        return {User.Role.VETERINARY_OFFICER, User.Role.FIELD_AGENT}
    if crop_related:
        return {
            User.Role.AGRICULTURAL_OFFICER,
            User.Role.AGRONOMIST,
            User.Role.FIELD_AGENT,
        }
    return set(HANDLER_ROLES)


def assigned_reports_for(user):
    if not is_active_account(user) or user.role not in HANDLER_ROLES:
        return AgriculturalReport.objects.none()

    queryset = AgriculturalReport.objects.filter(
        assignments__assigned_user=user,
        assignments__assignment_role=user.role,
        assignments__is_active=True,
    )
    crop_related = Q(
        category__in={
            AgriculturalReport.Category.CROP_HEALTH,
            AgriculturalReport.Category.SOIL,
            AgriculturalReport.Category.WATER_IRRIGATION,
            AgriculturalReport.Category.WEATHER_CLIMATE,
            AgriculturalReport.Category.INFRASTRUCTURE,
        }
    ) | Q(crop__isnull=False)
    livestock_related = (
        Q(category=AgriculturalReport.Category.LIVESTOCK_HEALTH)
        | Q(livestock_group__isnull=False)
        | Q(animal__isnull=False)
    )
    if user.role == User.Role.VETERINARY_OFFICER:
        queryset = queryset.exclude(crop_related)
    elif user.role in {User.Role.AGRICULTURAL_OFFICER, User.Role.AGRONOMIST}:
        queryset = queryset.exclude(livestock_related)
    return queryset.distinct()


def unassigned_reports():
    return (
        AgriculturalReport.objects.filter(
            status__in=[
                AgriculturalReport.Status.SUBMITTED,
                AgriculturalReport.Status.UNDER_REVIEW,
            ]
        )
        .filter(~Q(assignments__is_active=True))
        .distinct()
    )


STATUS_TRANSITIONS = {
    AgriculturalReport.Status.SUBMITTED: {
        AgriculturalReport.Status.UNDER_REVIEW,
        AgriculturalReport.Status.REJECTED,
        AgriculturalReport.Status.DUPLICATE,
    },
    AgriculturalReport.Status.UNDER_REVIEW: {
        AgriculturalReport.Status.REJECTED,
        AgriculturalReport.Status.DUPLICATE,
    },
    AgriculturalReport.Status.ASSIGNED: {
        AgriculturalReport.Status.UNDER_REVIEW,
        AgriculturalReport.Status.IN_PROGRESS,
        AgriculturalReport.Status.REJECTED,
        AgriculturalReport.Status.DUPLICATE,
    },
    AgriculturalReport.Status.IN_PROGRESS: {
        AgriculturalReport.Status.UNDER_REVIEW,
    },
    AgriculturalReport.Status.AWAITING_FARMER: {
        AgriculturalReport.Status.IN_PROGRESS,
    },
    AgriculturalReport.Status.RESOLVED: {AgriculturalReport.Status.CLOSED},
}


def allowed_status_transitions(report, actor):
    transitions = set(STATUS_TRANSITIONS.get(report.status, set()))
    if not is_report_coordinator(actor):
        transitions -= {
            AgriculturalReport.Status.REJECTED,
            AgriculturalReport.Status.DUPLICATE,
            AgriculturalReport.Status.CLOSED,
        }
    if (
        AgriculturalReport.Status.IN_PROGRESS in transitions
        and not is_assigned_handler(report, actor)
    ):
        transitions.remove(AgriculturalReport.Status.IN_PROGRESS)
    return transitions


def can_record_professional_updates(report, user):
    if user.role in {User.Role.FIELD_AGENT, User.Role.VETERINARY_OFFICER}:
        return (
            user.role == User.Role.VETERINARY_OFFICER
            and bool(
                report.category == AgriculturalReport.Category.LIVESTOCK_HEALTH
                or report.livestock_group_id
                or report.animal_id
            )
        )
    if user.role in {User.Role.AGRICULTURAL_OFFICER, User.Role.AGRONOMIST}:
        return not (
            report.category == AgriculturalReport.Category.LIVESTOCK_HEALTH
            or report.livestock_group_id
            or report.animal_id
        )
    return False


def create_report(*, farmer, **validated_data):
    for _ in range(5):
        try:
            with transaction.atomic():
                report = AgriculturalReport(farmer=farmer, **validated_data)
                report.save(force_insert=True)
                record_event(
                    report,
                    farmer,
                    ReportEvent.EventType.SUBMITTED,
                    {"status": report.status},
                )
            return report
        except IntegrityError:
            if _ == 4:
                raise
    raise ReportWorkflowError("Could not allocate a unique report reference.")


def _set_status(report, actor, new_status, reason, *, event_type=None):
    previous_status = report.status
    report.status = new_status
    if new_status == AgriculturalReport.Status.RESOLVED:
        report.resolution_summary = reason
        report.save(update_fields=["status", "resolution_summary", "updated_at"])
    else:
        report.save(update_fields=["status", "updated_at"])
    record_event(
        report,
        actor,
        event_type or ReportEvent.EventType.STATUS_CHANGED,
        {
            "from": previous_status,
            "to": new_status,
            "reason": reason,
        },
    )


@transaction.atomic
def assign_report(*, report, assigned_user, actor, reason):
    if not is_report_coordinator(actor):
        raise ReportAccessError("Only a case coordinator can assign or transfer reports.")
    if assigned_user.role not in allowed_handler_roles(report):
        raise ReportWorkflowError("The selected handler role is not appropriate for this report.")
    if (
        not assigned_user.is_active
        or assigned_user.account_status != User.AccountStatus.ACTIVE
    ):
        raise ReportWorkflowError("The selected handler account is not active.")
    if not reason.strip():
        raise ReportWorkflowError("An assignment or transfer reason is required.")

    report = AgriculturalReport.objects.select_for_update().get(pk=report.pk)
    if report.status in {
        AgriculturalReport.Status.RESOLVED,
        AgriculturalReport.Status.CLOSED,
        AgriculturalReport.Status.REJECTED,
        AgriculturalReport.Status.DUPLICATE,
    }:
        raise ReportWorkflowError("A terminal report cannot be assigned or transferred.")

    active_assignment = (
        CaseAssignment.objects.select_for_update()
        .filter(report=report, is_active=True)
        .first()
    )
    if active_assignment and active_assignment.assigned_user_id == assigned_user.pk:
        raise ReportWorkflowError("This handler is already assigned to the report.")

    assignment_type = ReportEvent.EventType.ASSIGNED
    if active_assignment:
        active_assignment.is_active = False
        active_assignment.ended_at = timezone.now()
        active_assignment.end_reason = reason
        active_assignment.save(update_fields=["is_active", "ended_at", "end_reason"])
        assignment_type = ReportEvent.EventType.REASSIGNED
        ReportUpdate.objects.create(
            report=report,
            author=actor,
            update_type=ReportUpdate.UpdateType.REASSIGNMENT_NOTE,
            message=reason,
            visible_to_farmer=False,
        )

    assignment = CaseAssignment.objects.create(
        report=report,
        assigned_user=assigned_user,
        assigned_by=actor,
        assignment_role=assigned_user.role,
        reason=reason,
    )
    previous_status = report.status
    if not active_assignment and previous_status != AgriculturalReport.Status.ASSIGNED:
        report.status = AgriculturalReport.Status.ASSIGNED
        report.save(update_fields=["status", "updated_at"])
        record_event(
            report,
            actor,
            ReportEvent.EventType.STATUS_CHANGED,
            {"from": previous_status, "to": report.status, "reason": reason},
        )
    record_event(
        report,
        actor,
        assignment_type,
        {
            "assignment_id": assignment.pk,
            "assigned_user_id": assigned_user.pk,
            "assignment_role": assigned_user.role,
        },
    )
    return assignment


@transaction.atomic
def transition_report(*, report, actor, new_status, reason):
    report = AgriculturalReport.objects.select_for_update().get(pk=report.pk)
    if new_status in {
        AgriculturalReport.Status.ASSIGNED,
        AgriculturalReport.Status.AWAITING_FARMER,
        AgriculturalReport.Status.RESOLVED,
    }:
        raise ReportWorkflowError(
            "Use the assignment, information-request, or resolution workflow for this status."
        )
    if not reason.strip():
        raise ReportWorkflowError("A reason is required for a status transition.")
    if not (is_report_coordinator(actor) or is_assigned_handler(report, actor)):
        raise ReportAccessError("Only an assigned handler or coordinator can change report status.")

    if new_status not in STATUS_TRANSITIONS.get(report.status, set()):
        raise ReportWorkflowError(
            f"Transition from '{report.status}' to '{new_status}' is not allowed."
        )
    if new_status in {
        AgriculturalReport.Status.REJECTED,
        AgriculturalReport.Status.DUPLICATE,
        AgriculturalReport.Status.CLOSED,
    } and not is_report_coordinator(actor):
        raise ReportAccessError(
            "Only a case coordinator can reject, mark duplicate, or close a report."
        )
    if new_status == AgriculturalReport.Status.IN_PROGRESS and not is_assigned_handler(
        report, actor
    ):
        raise ReportAccessError("An active assigned handler is required to start work.")
    _set_status(report, actor, new_status, reason)
    if new_status in {
        AgriculturalReport.Status.REJECTED,
        AgriculturalReport.Status.DUPLICATE,
        AgriculturalReport.Status.CLOSED,
    }:
        _end_active_assignments(report, reason)
    return report


def _end_active_assignments(report, reason):
    CaseAssignment.objects.filter(report=report, is_active=True).update(
        is_active=False,
        ended_at=timezone.now(),
        end_reason=reason,
    )


@transaction.atomic
def reopen_report(*, report, actor, reason):
    report = AgriculturalReport.objects.select_for_update().get(pk=report.pk)
    if not (is_report_coordinator(actor) or is_assigned_handler(report, actor)):
        raise ReportAccessError("Only a coordinator or assigned handler can reopen a report.")
    if report.status not in {
        AgriculturalReport.Status.RESOLVED,
        AgriculturalReport.Status.CLOSED,
        AgriculturalReport.Status.REJECTED,
        AgriculturalReport.Status.DUPLICATE,
    }:
        raise ReportWorkflowError("Only a terminal report can be reopened.")
    if not reason.strip():
        raise ReportWorkflowError("A reason is required to reopen a report.")
    previous_status = report.status
    report.status = AgriculturalReport.Status.UNDER_REVIEW
    report.save(update_fields=["status", "updated_at"])
    record_event(
        report,
        actor,
        ReportEvent.EventType.REOPENED,
        {"from": previous_status, "to": report.status, "reason": reason},
    )
    return report


@transaction.atomic
def add_farmer_clarification(*, report, farmer, message):
    report = AgriculturalReport.objects.select_for_update().get(pk=report.pk)
    if report.farmer_id != farmer.pk:
        raise ReportAccessError("Only the report owner can provide clarification.")
    if report.status != AgriculturalReport.Status.AWAITING_FARMER:
        raise ReportWorkflowError("Clarification is accepted only when information was requested.")
    if not message.strip():
        raise ReportWorkflowError("A clarification message is required.")
    update = ReportUpdate.objects.create(
        report=report,
        author=farmer,
        update_type=ReportUpdate.UpdateType.FARMER_CLARIFICATION,
        message=message,
        visible_to_farmer=True,
    )
    record_event(
        report,
        farmer,
        ReportEvent.EventType.UPDATE_CREATED,
        {"update_id": update.pk, "update_type": update.update_type},
    )
    return update


@transaction.atomic
def add_staff_update(
    *,
    report,
    author,
    update_type,
    message,
    visible_to_farmer=True,
):
    report = AgriculturalReport.objects.select_for_update().get(pk=report.pk)
    if not (is_assigned_handler(report, author) or is_report_coordinator(author)):
        raise ReportAccessError(
            "Only the active assigned handler or a case coordinator can update this report."
        )
    if not message.strip():
        raise ReportWorkflowError("A case update message is required.")
    if update_type in {
        ReportUpdate.UpdateType.FARMER_CLARIFICATION,
        ReportUpdate.UpdateType.REASSIGNMENT_NOTE,
    }:
        raise ReportWorkflowError("This update type is reserved for its corresponding workflow.")

    professional_update_types = {
        ReportUpdate.UpdateType.INVESTIGATION_FINDING,
        ReportUpdate.UpdateType.RECOMMENDATION,
        ReportUpdate.UpdateType.INTERVENTION,
        ReportUpdate.UpdateType.RESOLUTION_SUMMARY,
    }
    if (
        update_type in professional_update_types
        and not can_record_professional_updates(report, author)
    ):
        raise ReportAccessError(
            "This role cannot record professional findings for this report."
        )

    if update_type == ReportUpdate.UpdateType.INTERNAL_NOTE:
        visible_to_farmer = False
    elif update_type == ReportUpdate.UpdateType.REQUEST_INFORMATION:
        visible_to_farmer = True
        if report.status not in {
            AgriculturalReport.Status.ASSIGNED,
            AgriculturalReport.Status.IN_PROGRESS,
        }:
            raise ReportWorkflowError(
                "Information can be requested only from an assigned or in-progress report."
            )
    elif update_type == ReportUpdate.UpdateType.RESOLUTION_SUMMARY:
        if report.status not in {
            AgriculturalReport.Status.IN_PROGRESS,
            AgriculturalReport.Status.AWAITING_FARMER,
        }:
            raise ReportWorkflowError("The report is not ready to be resolved.")
        if author.role == User.Role.FIELD_AGENT:
            raise ReportAccessError("Field agents cannot resolve reports.")
        visible_to_farmer = True

    update = ReportUpdate.objects.create(
        report=report,
        author=author,
        update_type=update_type,
        message=message,
        visible_to_farmer=visible_to_farmer,
    )
    record_event(
        report,
        author,
        ReportEvent.EventType.UPDATE_CREATED,
        {
            "update_id": update.pk,
            "update_type": update.update_type,
            "visible_to_farmer": update.visible_to_farmer,
        },
    )

    if update_type == ReportUpdate.UpdateType.REQUEST_INFORMATION:
        _set_status(
            report,
            author,
            AgriculturalReport.Status.AWAITING_FARMER,
            "Farmer information requested.",
        )
    elif update_type == ReportUpdate.UpdateType.RESOLUTION_SUMMARY:
        _set_status(
            report,
            author,
            AgriculturalReport.Status.RESOLVED,
            message,
        )
    return update


@transaction.atomic
def add_report_evidence(*, report, actor, image, caption=""):
    report = AgriculturalReport.objects.select_for_update().get(pk=report.pk)
    if report.farmer_id != actor.pk and not is_assigned_handler(report, actor):
        raise ReportAccessError("Only the report owner or active assigned handler can add evidence.")
    evidence = report.evidence.create(
        image=image,
        caption=caption,
        uploaded_by=actor,
    )
    record_event(
        report,
        actor,
        ReportEvent.EventType.EVIDENCE_ADDED,
        {"evidence_id": evidence.pk},
    )
    return evidence
