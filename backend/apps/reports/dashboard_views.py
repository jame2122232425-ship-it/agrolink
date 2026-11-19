from functools import wraps

from django.contrib import messages
from django.contrib.auth.views import LoginView, LogoutView
from django.core.paginator import Paginator
from django.db import transaction
from django.db.models import Count, Q
from django.http import HttpResponseForbidden
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse, reverse_lazy
from django.views.decorators.http import require_POST

from apps.accounts.permissions import has_platform_access, is_platform_super_admin
from apps.accounts.models import User
from apps.reports.dashboard_forms import (
    CaseAssignmentForm,
    CaseFilterForm,
    CaseReopenForm,
    CaseTransitionForm,
    StaffAuthenticationForm,
    StaffCaseUpdateForm,
)
from apps.reports.models import AgriculturalReport, ReportEvent, ReportUpdate
from apps.reports.permissions import (
    HANDLER_ROLES,
    is_active_account,
    is_report_coordinator,
)
from apps.reports.services import (
    ReportAccessError,
    ReportWorkflowError,
    add_report_evidence,
    add_staff_update,
    allowed_status_transitions,
    assigned_reports_for,
    assign_report,
    can_record_professional_updates,
    is_assigned_handler,
    reopen_report,
    transition_report,
    unassigned_reports,
)


TERMINAL_REPORT_STATUSES = {
    AgriculturalReport.Status.RESOLVED,
    AgriculturalReport.Status.CLOSED,
    AgriculturalReport.Status.REJECTED,
    AgriculturalReport.Status.DUPLICATE,
}


def has_staff_dashboard_access(user):
    return is_active_account(user) and (
        user.role in HANDLER_ROLES or is_report_coordinator(user)
    )


def staff_access_required(view_func):
    @wraps(view_func)
    def wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect(f"{reverse('staff:login')}?next={request.path}")
        if not has_staff_dashboard_access(request.user):
            return HttpResponseForbidden("Staff dashboard access is required.")
        return view_func(request, *args, **kwargs)

    return wrapped


class StaffLoginView(LoginView):
    template_name = "staff/login.html"
    authentication_form = StaffAuthenticationForm
    redirect_authenticated_user = False

    def get_success_url(self):
        redirect_url = self.get_redirect_url()
        if redirect_url:
            return redirect_url
        if is_platform_super_admin(self.request.user) or (
            self.request.user.role == User.Role.STAFF
            and has_platform_access(self.request.user)
            and not is_report_coordinator(self.request.user)
        ):
            return reverse("platform:dashboard")
        return reverse("staff:dashboard")


class StaffLogoutView(LogoutView):
    next_page = reverse_lazy("staff:login")
    http_method_names = ["post", "options"]


def _case_queryset_for(user):
    if is_report_coordinator(user):
        queryset = AgriculturalReport.objects.all()
    else:
        queryset = assigned_reports_for(user)
    return queryset.select_related(
        "farmer",
        "farm",
        "plot",
        "crop",
        "livestock_group",
        "animal",
    )


def _case_for_user(user, report_id):
    queryset = _case_queryset_for(user).prefetch_related(
        "assignments__assigned_user",
        "assignments__assigned_by",
        "updates__author",
        "events__actor",
        "evidence__uploaded_by",
    )
    return get_object_or_404(queryset, pk=report_id)


def _breakdown(queryset, field, choices):
    counts = {
        row[field]: row["total"]
        for row in queryset.values(field).annotate(total=Count("pk"))
    }
    maximum = max(counts.values(), default=0)
    return [
        {
            "value": value,
            "label": label,
            "count": counts.get(value, 0),
            "width": round(counts.get(value, 0) * 100 / maximum) if maximum else 0,
        }
        for value, label in choices
    ]


def _paginate(request, queryset, *, page_size=20):
    page_obj = Paginator(queryset, page_size).get_page(request.GET.get("page"))
    query = request.GET.copy()
    query.pop("page", None)
    return page_obj, query.urlencode()


@staff_access_required
def staff_dashboard(request):
    if is_report_coordinator(request.user):
        queue = unassigned_reports().select_related("farmer", "farm")
        context = {
            "unassigned_count": queue.count(),
            "severity_breakdown": _breakdown(
                queue, "severity", AgriculturalReport.Severity.choices
            ),
            "category_breakdown": _breakdown(
                queue, "category", AgriculturalReport.Category.choices
            ),
            "recent_cases": queue.order_by("-submitted_at", "-pk")[:6],
        }
        return render(request, "staff/dashboard_coordinator.html", context)

    assigned = assigned_reports_for(request.user).select_related(
        "farmer", "farm"
    )
    statuses = {
        value: assigned.filter(status=value).count()
        for value in AgriculturalReport.Status.values
    }
    context = {
        "assigned_count": assigned.count(),
        "awaiting_review_count": sum(
            statuses[status]
            for status in (
                AgriculturalReport.Status.SUBMITTED,
                AgriculturalReport.Status.UNDER_REVIEW,
                AgriculturalReport.Status.ASSIGNED,
            )
        ),
        "in_progress_count": statuses[AgriculturalReport.Status.IN_PROGRESS],
        "awaiting_farmer_count": statuses[AgriculturalReport.Status.AWAITING_FARMER],
        "severity_breakdown": _breakdown(
            assigned, "severity", AgriculturalReport.Severity.choices
        ),
        "recent_cases": assigned.order_by("-updated_at", "-pk")[:6],
    }
    return render(request, "staff/dashboard_officer.html", context)


@staff_access_required
def staff_case_list(request):
    if is_report_coordinator(request.user):
        return redirect("staff:unassigned")

    form = CaseFilterForm(request.GET or None)
    queryset = assigned_reports_for(request.user).select_related("farmer", "farm")
    if form.is_bound and form.is_valid():
        filters = form.cleaned_data
        if filters["q"]:
            term = filters["q"].strip()
            queryset = queryset.filter(
                Q(report_reference__icontains=term)
                | Q(title__icontains=term)
                | Q(description__icontains=term)
                | Q(farmer__first_name__icontains=term)
                | Q(farmer__last_name__icontains=term)
                | Q(farmer__email__icontains=term)
            )
        for field in ("category", "severity", "status"):
            if filters[field]:
                queryset = queryset.filter(**{field: filters[field]})
    page_obj, pagination_query = _paginate(request, queryset)
    return render(
        request,
        "staff/case_list.html",
        {
            "page_obj": page_obj,
            "filter_form": form,
            "pagination_query": pagination_query,
            "page_title": "Assigned cases",
            "empty_message": "No assigned cases match these filters.",
        },
    )


@staff_access_required
def staff_unassigned_cases(request):
    if not is_report_coordinator(request.user):
        return HttpResponseForbidden("Only case coordinators can view the unassigned queue.")

    form = CaseFilterForm(request.GET or None)
    queryset = unassigned_reports().select_related("farmer", "farm")
    if form.is_bound and form.is_valid():
        filters = form.cleaned_data
        if filters["q"]:
            term = filters["q"].strip()
            queryset = queryset.filter(
                Q(report_reference__icontains=term)
                | Q(title__icontains=term)
                | Q(description__icontains=term)
                | Q(farmer__first_name__icontains=term)
                | Q(farmer__last_name__icontains=term)
                | Q(farmer__email__icontains=term)
            )
        for field in ("category", "severity", "status"):
            if filters[field]:
                queryset = queryset.filter(**{field: filters[field]})
    page_obj, pagination_query = _paginate(request, queryset)
    return render(
        request,
        "staff/case_list.html",
        {
            "page_obj": page_obj,
            "filter_form": form,
            "pagination_query": pagination_query,
            "page_title": "Unassigned queue",
            "empty_message": "There are no unassigned cases matching these filters.",
        },
    )


def _case_detail_context(request, report):
    is_coordinator = is_report_coordinator(request.user)
    assigned_handler = is_assigned_handler(report, request.user)
    crop_observations = []
    livestock_observations = []
    medical_records = []
    if report.crop_id:
        crop_observations = report.crop.health_observations.select_related(
            "recorded_by"
        ).order_by("-observation_date", "-pk")[:8]
    if report.animal_id:
        livestock_observations = report.animal.health_observations.select_related(
            "recorded_by"
        ).order_by("-observation_date", "-pk")[:8]
        medical_records = report.animal.medical_records.order_by(
            "-administration_date", "-pk"
        )[:8]
    elif report.livestock_group_id:
        livestock_observations = report.livestock_group.health_observations.select_related(
            "recorded_by"
        ).order_by("-observation_date", "-pk")[:8]
        medical_records = report.livestock_group.medical_records.order_by(
            "-administration_date", "-pk"
        )[:8]

    transition_form = None
    if is_coordinator or assigned_handler:
        transition_form = CaseTransitionForm(report=report, user=request.user)

    return {
        "report": report,
        "is_coordinator": is_coordinator,
        "is_assigned_handler": assigned_handler,
        "can_update_case": assigned_handler or is_coordinator,
        "can_view_private_evidence": assigned_handler,
        "can_manage_assignments": is_coordinator,
        "crop_observations": crop_observations,
        "livestock_observations": livestock_observations,
        "medical_records": medical_records,
        "updates": report.updates.select_related("author").all(),
        "assignments": report.assignments.select_related(
            "assigned_user", "assigned_by"
        ).all(),
        "events": report.events.select_related("actor").all(),
        "evidence": report.evidence.select_related("uploaded_by").all(),
        "transition_form": transition_form,
        "reopen_form": CaseReopenForm()
        if report.status in TERMINAL_REPORT_STATUSES
        and (is_coordinator or assigned_handler)
        else None,
        "update_form": StaffCaseUpdateForm(user=request.user, report=report)
        if assigned_handler or is_coordinator
        else None,
    }


@staff_access_required
def staff_case_detail(request, report_id):
    report = _case_for_user(request.user, report_id)
    return render(
        request,
        "staff/case_detail.html",
        _case_detail_context(request, report),
    )


@staff_access_required
@require_POST
def staff_case_update(request, report_id):
    report = _case_for_user(request.user, report_id)
    if not (
        is_assigned_handler(report, request.user)
        or is_report_coordinator(request.user)
    ):
        return HttpResponseForbidden(
            "Only the active assigned handler or a case coordinator can update this case."
        )

    form = StaffCaseUpdateForm(user=request.user, report=report, data=request.POST, files=request.FILES)
    if not form.is_valid():
        errors = [
            f"{field}: {', '.join(messages)}"
            for field, messages in form.errors.items()
        ]
        messages.error(request, "; ".join(errors) or "Check the submitted update.")
        return redirect("staff:case-detail", report_id=report.pk)

    data = form.cleaned_data
    try:
        with transaction.atomic():
            if data["update_type"]:
                add_staff_update(
                    report=report,
                    author=request.user,
                    update_type=data["update_type"],
                    message=data["message"],
                    visible_to_farmer=data["visible_to_farmer"],
                )
            if data.get("image"):
                add_report_evidence(
                    report=report,
                    actor=request.user,
                    image=data["image"],
                    caption=data.get("caption", ""),
                )
    except ReportAccessError as exc:
        return HttpResponseForbidden(str(exc))
    except ReportWorkflowError as exc:
        messages.error(request, str(exc))
        return redirect("staff:case-detail", report_id=report.pk)

    messages.success(request, "Case update saved.")
    return redirect("staff:case-detail", report_id=report.pk)


@staff_access_required
def staff_case_assignments(request, report_id):
    if not is_report_coordinator(request.user) and request.user.role not in HANDLER_ROLES:
        return HttpResponseForbidden("Only authorized staff can view assignment history.")
    report = _case_for_user(request.user, report_id)
    form = None
    if request.method == "POST":
        if not is_report_coordinator(request.user):
            return HttpResponseForbidden("Only case coordinators can assign or transfer cases.")
        form = CaseAssignmentForm(report=report, data=request.POST)
        if form.is_valid():
            try:
                assign_report(
                    report=report,
                    assigned_user=form.cleaned_data["assigned_user"],
                    actor=request.user,
                    reason=form.cleaned_data["reason"],
                )
            except ReportAccessError as exc:
                return HttpResponseForbidden(str(exc))
            except ReportWorkflowError as exc:
                messages.error(request, str(exc))
            else:
                messages.success(request, "Case assignment saved.")
                return redirect("staff:case-assignments", report_id=report.pk)
        else:
            messages.error(request, "Please correct the assignment form and try again.")
    elif is_report_coordinator(request.user):
        form = CaseAssignmentForm(report=report)

    return render(
        request,
        "staff/assignments.html",
        {
            "report": report,
            "assignments": report.assignments.select_related(
                "assigned_user", "assigned_by"
            ).all(),
            "assignment_form": form,
            "can_manage_assignments": is_report_coordinator(request.user),
        },
    )


@staff_access_required
@require_POST
def staff_case_transition(request, report_id):
    report = _case_for_user(request.user, report_id)
    form = CaseTransitionForm(report=report, user=request.user, data=request.POST)
    if not form.is_valid():
        messages.error(request, "Choose an allowed case status and provide a reason.")
        return redirect("staff:case-detail", report_id=report.pk)
    try:
        transition_report(
            report=report,
            actor=request.user,
            new_status=form.cleaned_data["new_status"],
            reason=form.cleaned_data["reason"],
        )
    except ReportAccessError as exc:
        return HttpResponseForbidden(str(exc))
    except ReportWorkflowError as exc:
        messages.error(request, str(exc))
        return redirect("staff:case-detail", report_id=report.pk)
    messages.success(request, "Case status updated.")
    return redirect("staff:case-detail", report_id=report.pk)


@staff_access_required
@require_POST
def staff_case_reopen(request, report_id):
    report = _case_for_user(request.user, report_id)
    form = CaseReopenForm(request.POST)
    if not form.is_valid():
        messages.error(request, "Provide a reason to reopen this case.")
        return redirect("staff:case-detail", report_id=report.pk)
    try:
        reopen_report(
            report=report,
            actor=request.user,
            reason=form.cleaned_data["reason"],
        )
    except ReportAccessError as exc:
        return HttpResponseForbidden(str(exc))
    except ReportWorkflowError as exc:
        messages.error(request, str(exc))
        return redirect("staff:case-detail", report_id=report.pk)
    messages.success(request, "Case reopened.")
    return redirect("staff:case-detail", report_id=report.pk)


@staff_access_required
def staff_officers(request):
    if not is_report_coordinator(request.user):
        return HttpResponseForbidden("Only case coordinators can view the officer directory.")
    officers = (
        User.objects.filter(
            role__in=HANDLER_ROLES,
            is_active=True,
            account_status=User.AccountStatus.ACTIVE,
        )
        .annotate(
            active_case_count=Count(
                "case_assignments",
                filter=Q(case_assignments__is_active=True),
            )
        )
        .order_by("role", "first_name", "last_name", "email")
    )
    return render(request, "staff/officers.html", {"officers": officers})
