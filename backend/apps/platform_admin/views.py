import smtplib
from datetime import datetime, timedelta
from functools import wraps

from django.contrib import messages
from django.contrib.auth.forms import PasswordResetForm
from django.core.exceptions import ImproperlyConfigured, ValidationError
from django.core.paginator import Paginator
from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from django.shortcuts import get_object_or_404, redirect, render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.http import require_POST

from apps.accounts.models import FarmerProfile, Role, User
from apps.accounts.permissions import (
    has_platform_access,
    has_platform_permission,
    is_platform_super_admin,
    permission_matrix,
)
from apps.crops.models import Crop, CropGrowthStage, CropHealthObservation
from apps.community.models import CommunityContentReport, CommunityPost
from apps.farms.models import Farm, FarmNote, FarmPlot
from apps.livestock.models import (
    Animal,
    LivestockGroup,
    LivestockHealthObservation,
    LivestockMedicalRecord,
)
from apps.platform_admin.forms import (
    AccountStatusForm,
    CropGrowthStageForm,
    DirectoryFilterForm,
    RoleForm,
    RoleMemberForm,
    RolePermissionForm,
    SensitiveActionForm,
    StaffCreationForm,
    StaffPermissionForm,
    UserRoleForm,
)
from apps.platform_admin.models import AdminAuditEvent
from apps.platform_admin.services import (
    assignable_roles,
    change_account_status,
    create_role,
    create_staff_account,
    delete_role,
    record_admin_action,
    save_crop_growth_stage,
    set_user_roles,
    update_role,
    update_role_members,
    update_role_permissions,
)
from apps.reports.models import AgriculturalReport, ReportEvent
from apps.reports.permissions import is_report_coordinator
from apps.reports.services import unassigned_reports


PROFESSIONAL_ROLES = (
    User.Role.AGRICULTURAL_OFFICER,
    User.Role.VETERINARY_OFFICER,
    User.Role.AGRONOMIST,
    User.Role.FIELD_AGENT,
)
FEATURED_METRICS = (
    ("Registered farmers", "Total farmers", "farmers", "green"),
    ("Registered farms", "Total farms", "farms", "green"),
    ("Staff accounts", "Staff accounts", "staff", "green"),
    ("Agricultural professionals", "Professionals", "professionals", "blue"),
    ("Agricultural reports", "Total reports", "reports", "blue"),
    ("Active unresolved cases", "Active cases", "cases", "red"),
)
OPEN_CASE_STATUSES = (
    AgriculturalReport.Status.SUBMITTED,
    AgriculturalReport.Status.UNDER_REVIEW,
    AgriculturalReport.Status.ASSIGNED,
    AgriculturalReport.Status.IN_PROGRESS,
    AgriculturalReport.Status.AWAITING_FARMER,
)
USER_CATEGORIES = {
    "farmers": {
        "label": "Farmers",
        "roles": (User.Role.FARMER,),
        "view_permission": "view_farmer_accounts",
        "manage_permission": "manage_farmer_accounts",
    },
    "staff": {
        "label": "Staff",
        "roles": (User.Role.STAFF,),
        "view_permission": None,
        "manage_permission": None,
    },
    "professionals": {
        "label": "Agricultural professionals",
        "roles": PROFESSIONAL_ROLES,
        "view_permission": "view_professional_accounts",
        "manage_permission": "manage_professional_accounts",
    },
}


def _platform_access_required(view_func):
    @wraps(view_func)
    def wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect(f"{reverse('staff:login')}?next={request.get_full_path()}")
        if not has_platform_access(request.user):
            return _forbidden(request, "Platform administration access is required for this account.")
        return view_func(request, *args, **kwargs)

    return wrapped


def _super_admin_required(view_func):
    @wraps(view_func)
    def wrapped(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return redirect(f"{reverse('staff:login')}?next={request.get_full_path()}")
        if not is_platform_super_admin(request.user):
            return _forbidden(request, "This action is reserved for Super Admin accounts.")
        return view_func(request, *args, **kwargs)

    return wrapped


def _permission_required(permission):
    def decorate(view_func):
        @_platform_access_required
        @wraps(view_func)
        def wrapped(request, *args, **kwargs):
            if not has_platform_permission(request.user, permission):
                return _forbidden(request, "Your current role does not include this page.")
            return view_func(request, *args, **kwargs)

        return wrapped

    return decorate


def _forbidden(request, message):
    staff_roles = {
        User.Role.AGRICULTURAL_OFFICER,
        User.Role.VETERINARY_OFFICER,
        User.Role.AGRONOMIST,
        User.Role.FIELD_AGENT,
    }
    return render(
        request,
        "platform/forbidden.html",
        {
            "message": message,
            "can_open_staff_workspace": has_platform_access(request.user)
            or request.user.role in staff_roles,
        },
        status=403,
    )


def _breakdown(queryset, field, choices=None):
    rows = queryset.values(field).annotate(total=Count("pk")).order_by("-total", field)
    if not choices:
        rows = rows[:8]
    counts = {row[field]: row["total"] for row in rows}
    labels = dict(choices or ())
    maximum = max(counts.values(), default=0)
    values = choices or [(value, value.replace("_", " ").title()) for value in counts]
    return [
        {
            "value": value,
            "label": labels.get(value, label),
            "count": counts.get(value, 0),
            "width": round(counts.get(value, 0) * 100 / maximum) if maximum else 0,
        }
        for value, label in values
        if counts.get(value, 0)
    ]


def _registration_trend(county=""):
    now = timezone.localtime()
    month_starts = []
    for offset in range(5, -1, -1):
        month_index = now.year * 12 + now.month - 1 - offset
        year, month_zero = divmod(month_index, 12)
        month_starts.append(datetime(year, month_zero + 1, 1, tzinfo=now.tzinfo))

    users = User.objects.filter(
        role=User.Role.FARMER,
        date_joined__gte=month_starts[0],
        date_joined__lt=now,
    )
    if county:
        users = users.filter(farmer_profile__county__iexact=county)
    rows = users.annotate(month=TruncMonth("date_joined")).values("month").annotate(
        total=Count("pk")
    )
    counts = {
        (row["month"].year, row["month"].month): row["total"]
        for row in rows
        if row["month"]
    }
    maximum = max(counts.values(), default=0)
    return [
        {
            "label": month.strftime("%b"),
            "count": counts.get((month.year, month.month), 0),
            "width": round(
                counts.get((month.year, month.month), 0) * 100 / maximum
            )
            if maximum
            else 0,
        }
        for month in month_starts
    ]


def _dashboard_context(
    *,
    county="",
    show_global_metrics=True,
    show_farmer_accounts=True,
    show_farm_oversight=True,
    show_operational_reports=True,
):
    farm_filter = {"county__iexact": county} if county else {}
    user_filter = {"farmer_profile__county__iexact": county} if county else {}
    farms = Farm.objects.filter(**farm_filter)
    reports = AgriculturalReport.objects.filter(farm__in=farms) if county else AgriculturalReport.objects.all()
    crops = Crop.objects.filter(farm__in=farms) if county else Crop.objects.all()
    groups = LivestockGroup.objects.filter(farm__in=farms) if county else LivestockGroup.objects.all()
    animals = Animal.objects.filter(farm__in=farms) if county else Animal.objects.all()
    plots = FarmPlot.objects.filter(farm__in=farms) if county else FarmPlot.objects.all()
    crop_observations = (
        CropHealthObservation.objects.filter(crop__farm__in=farms)
        if county
        else CropHealthObservation.objects.all()
    )
    livestock_observations = (
        LivestockHealthObservation.objects.filter(
            Q(animal__farm__in=farms) | Q(group__farm__in=farms)
        )
        if county
        else LivestockHealthObservation.objects.all()
    )
    farmers = User.objects.filter(role=User.Role.FARMER, **user_filter)

    all_metrics = [
        {"label": "Registered farmers", "value": farmers.count(), "tone": "green"},
        {"label": "Registered farms", "value": farms.count(), "tone": "blue"},
        {"label": "Plots", "value": plots.count(), "tone": "cream"},
        {"label": "Crop records", "value": crops.count(), "tone": "green"},
        {"label": "Livestock groups", "value": groups.count(), "tone": "amber"},
        {"label": "Individual animals", "value": animals.count(), "tone": "blue"},
        {"label": "Agricultural reports", "value": reports.count(), "tone": "amber"},
        {
            "label": "Active unresolved cases",
            "value": reports.filter(status__in=OPEN_CASE_STATUSES).count(),
            "tone": "cream",
        },
        {
            "label": "Critical open cases",
            "value": reports.filter(
                severity=AgriculturalReport.Severity.CRITICAL,
                status__in=OPEN_CASE_STATUSES,
            ).count(),
            "tone": "amber",
        },
        {
            "label": "Unassigned cases",
            "value": unassigned_reports().filter(farm__in=farms).count(),
            "tone": "blue",
        },
        {
            "label": "Crop health observations",
            "value": crop_observations.count(),
            "tone": "green",
        },
        {
            "label": "Livestock health observations",
            "value": livestock_observations.count(),
            "tone": "blue",
        },
    ]
    if show_global_metrics:
        all_metrics.extend(
            [
                {
                    "label": "Staff accounts",
                    "value": User.objects.filter(role=User.Role.STAFF).count(),
                    "tone": "green",
                },
                {
                    "label": "Agricultural professionals",
                    "value": User.objects.filter(role__in=PROFESSIONAL_ROLES).count(),
                    "tone": "amber",
                },
                {
                    "label": "New farmers (30 days)",
                    "value": User.objects.filter(
                        role=User.Role.FARMER,
                        date_joined__gte=timezone.now() - timedelta(days=30),
                        **user_filter,
                    ).count(),
                    "tone": "blue",
                },
            ]
        )
    visible_labels = set()
    if show_global_metrics or show_farmer_accounts:
        visible_labels.update({"Registered farmers", "New farmers (30 days)"})
    if show_global_metrics or show_farm_oversight:
        visible_labels.update(
            {
                "Registered farms",
                "Plots",
                "Crop records",
                "Livestock groups",
                "Individual animals",
                "Crop health observations",
                "Livestock health observations",
            }
        )
    if show_global_metrics or show_operational_reports:
        visible_labels.update(
            {
                "Agricultural reports",
                "Active unresolved cases",
                "Critical open cases",
                "Unassigned cases",
            }
        )
    metrics = [item for item in all_metrics if item["label"] in visible_labels]
    metrics_by_label = {metric["label"]: metric for metric in metrics}
    featured_metrics = [
        {
            **metrics_by_label[label],
            "display_label": display_label,
            "icon": icon,
            "icon_tone": icon_tone,
        }
        for label, display_label, icon, icon_tone in FEATURED_METRICS
        if label in metrics_by_label
    ]

    county_rows = FarmerProfile.objects.exclude(county="").values("county").annotate(
        total=Count("pk")
    ).order_by("-total", "county")[:8]
    crop_distribution = _breakdown(crops, "crop_name")
    livestock_distribution = _breakdown(animals, "species")
    report_categories = _breakdown(reports, "category", AgriculturalReport.Category.choices)
    report_statuses = _breakdown(reports, "status", AgriculturalReport.Status.choices)

    context = {
        "metrics": metrics,
        "featured_metrics": featured_metrics,
        "county": county,
        "county_choices": list(
            FarmerProfile.objects.exclude(county="")
            .order_by("county")
            .values_list("county", flat=True)
            .distinct()
        ),
        "farmer_registrations": _registration_trend(county)
        if show_global_metrics or show_farmer_accounts
        else [],
        "county_breakdown": [
            {
                "label": row["county"],
                "count": row["total"],
                "width": 0,
            }
            for row in county_rows
        ],
        "crop_distribution": crop_distribution
        if show_global_metrics or show_farm_oversight
        else [],
        "livestock_distribution": livestock_distribution
        if show_global_metrics or show_farm_oversight
        else [],
        "report_categories": report_categories
        if show_global_metrics or show_operational_reports
        else [],
        "report_statuses": report_statuses
        if show_global_metrics or show_operational_reports
        else [],
        "show_global_metrics": show_global_metrics,
    }
    for key in ("county_breakdown",):
        maximum = max((item["count"] for item in context[key]), default=0)
        for item in context[key]:
            item["width"] = round(item["count"] * 100 / maximum) if maximum else 0

    if show_global_metrics:
        context["recent_cases"] = (
            reports.select_related("farmer", "farm")
            .order_by("-submitted_at", "-pk")[:6]
        )
        context["recent_admin_events"] = (
            AdminAuditEvent.objects.select_related("actor", "target_user")[:8]
        )
        context["recent_report_events"] = (
            ReportEvent.objects.select_related("actor", "report")[:8]
        )
    return context


@_platform_access_required
def platform_dashboard(request):
    is_super_admin = is_platform_super_admin(request.user)
    can_view_operations = is_super_admin or has_platform_permission(
        request.user, "view_operational_reports"
    )
    can_view_farm_oversight = is_super_admin or has_platform_permission(
        request.user, "view_farm_oversight"
    )
    can_view_farmer_accounts = is_super_admin or has_platform_permission(
        request.user, "view_farmer_accounts"
    )
    if is_super_admin or can_view_operations or can_view_farm_oversight or can_view_farmer_accounts:
        county = request.GET.get("county", "").strip() if is_super_admin else ""
        valid_counties = {
            value.casefold(): value
            for value in
            FarmerProfile.objects.exclude(county="")
            .values_list("county", flat=True)
            .distinct()
        }
        if county and county.casefold() not in valid_counties:
            return render(
                request,
                "platform/dashboard.html",
                {
                    "error_message": "Select a supported county.",
                    "is_super_admin": is_super_admin,
                    "can_view_operations": can_view_operations,
                },
                status=400,
            )
        county = valid_counties.get(county.casefold(), "") if county else ""
        context = _dashboard_context(
            county=county,
            show_global_metrics=is_super_admin,
            show_farmer_accounts=can_view_farmer_accounts,
            show_farm_oversight=can_view_farm_oversight,
            show_operational_reports=can_view_operations,
        )
        if not is_super_admin and not can_view_farmer_accounts:
            context["county_breakdown"] = []
    else:
        context = {
            "metrics": [],
            "is_super_admin": False,
            "can_view_operations": False,
        }
    context.update(
        {
            "is_super_admin": is_super_admin,
            "can_view_operations": can_view_operations,
            "can_view_farmers": can_view_farmer_accounts,
            "can_view_professionals": has_platform_permission(
                request.user, "view_professional_accounts"
            ),
            "can_view_farm_oversight": can_view_farm_oversight,
            "can_coordinate_cases": is_report_coordinator(request.user),
            "can_manage_reference_data": has_platform_permission(
                request.user, "manage_reference_data"
            ),
        }
    )
    return render(request, "platform/dashboard.html", context)


def _filtered_page(request, queryset, search_fields, *, page_parameter="page"):
    query = request.GET.get("q", "").strip()
    if query:
        search = Q()
        for field in search_fields:
            search |= Q(**{f"{field}__icontains": query})
        queryset = queryset.filter(search)

    page_obj = Paginator(queryset, 25).get_page(request.GET.get(page_parameter))
    pagination_query = request.GET.copy()
    pagination_query.pop(page_parameter, None)
    return page_obj, pagination_query.urlencode()


@_permission_required("view_farm_oversight")
def farm_overview(request):
    farms = (
        Farm.objects.select_related("farmer")
        .annotate(
            plot_count=Count("plots", distinct=True),
            crop_count=Count("crops", distinct=True),
            livestock_group_count=Count("livestock_groups", distinct=True),
        )
        .order_by("name", "pk")
    )
    page_obj, pagination_query = _filtered_page(
        request,
        farms,
        (
            "name",
            "county",
            "sub_county",
            "farmer__first_name",
            "farmer__last_name",
            "farmer__email",
        ),
    )
    return render(
        request,
        "platform/farms.html",
        {
            "page_obj": page_obj,
            "pagination_query": pagination_query,
            "query": request.GET.get("q", "").strip(),
            "farm_count": Farm.objects.count(),
            "plot_count": FarmPlot.objects.count(),
        },
    )


@_permission_required("view_farm_oversight")
def crop_overview(request):
    crops = Crop.objects.select_related(
        "farm",
        "farm__farmer",
        "plot",
        "growth_stage",
    )
    page_obj, pagination_query = _filtered_page(
        request,
        crops,
        (
            "crop_name",
            "variety",
            "farm__name",
            "farm__county",
            "farm__farmer__first_name",
            "farm__farmer__last_name",
            "farm__farmer__email",
        ),
    )
    return render(
        request,
        "platform/crops.html",
        {
            "page_obj": page_obj,
            "pagination_query": pagination_query,
            "query": request.GET.get("q", "").strip(),
            "crop_count": Crop.objects.count(),
        },
    )


@_permission_required("view_farm_oversight")
def livestock_overview(request):
    groups, groups_query = _filtered_page(
        request,
        LivestockGroup.objects.select_related("farm", "farm__farmer"),
        (
            "species",
            "breed",
            "group_name",
            "farm__name",
            "farm__county",
            "farm__farmer__first_name",
            "farm__farmer__last_name",
        ),
        page_parameter="groups_page",
    )
    animals, animals_query = _filtered_page(
        request,
        Animal.objects.select_related("farm", "farm__farmer", "group"),
        (
            "species",
            "breed",
            "name_or_tag",
            "identification_number",
            "farm__name",
            "farm__county",
            "farm__farmer__first_name",
            "farm__farmer__last_name",
        ),
        page_parameter="animals_page",
    )
    return render(
        request,
        "platform/livestock.html",
        {
            "groups_page": groups,
            "groups_query": groups_query,
            "animals_page": animals,
            "animals_query": animals_query,
            "query": request.GET.get("q", "").strip(),
            "group_count": LivestockGroup.objects.count(),
            "animal_count": Animal.objects.count(),
        },
    )


@_permission_required("view_operational_reports")
def report_overview(request):
    reports = AgriculturalReport.objects.select_related(
        "farmer",
        "farm",
    )
    page_obj, pagination_query = _filtered_page(
        request,
        reports,
        (
            "report_reference",
            "title",
            "farmer__first_name",
            "farmer__last_name",
            "farmer__email",
            "farm__name",
            "farm__county",
        ),
    )
    return render(
        request,
        "platform/reports.html",
        {
            "page_obj": page_obj,
            "pagination_query": pagination_query,
            "query": request.GET.get("q", "").strip(),
            "report_count": AgriculturalReport.objects.count(),
            "open_report_count": AgriculturalReport.objects.filter(
                status__in=OPEN_CASE_STATUSES
            ).count(),
            "critical_report_count": AgriculturalReport.objects.filter(
                severity=AgriculturalReport.Severity.CRITICAL,
                status__in=OPEN_CASE_STATUSES,
            ).count(),
            "unassigned_report_count": unassigned_reports().count(),
        },
    )


def _category_for_request(user, category):
    config = USER_CATEGORIES.get(category)
    if not config:
        return None
    if category == "staff":
        return config if is_platform_super_admin(user) else None
    if has_platform_permission(user, config["view_permission"]):
        return config
    return None


def _accounts_for_category(category, config):
    accounts = User.objects.filter(role__in=config["roles"])
    if category == "farmers":
        accounts = accounts.filter(
            farmer_profile__isnull=False,
            is_staff=False,
            is_superuser=False,
        )
    return accounts


@_platform_access_required
def user_directory(request, category):
    config = _category_for_request(request.user, category)
    if not config:
        return _forbidden(request, "Your role does not include access to this account directory.")

    form = DirectoryFilterForm(request.GET or None)
    queryset = _accounts_for_category(category, config)
    if category == "professionals":
        queryset = queryset.annotate(
            active_case_count=Count(
                "case_assignments",
                filter=Q(case_assignments__is_active=True),
            )
        )
    queryset = queryset.order_by("-date_joined", "-pk")
    if form.is_bound and form.is_valid():
        filters = form.cleaned_data
        if filters["q"]:
            term = filters["q"].strip()
            queryset = queryset.filter(
                Q(email__icontains=term)
                | Q(first_name__icontains=term)
                | Q(last_name__icontains=term)
            )
        if filters["status"]:
            queryset = queryset.filter(account_status=filters["status"])
    page_obj = Paginator(queryset, 25).get_page(request.GET.get("page"))
    query = request.GET.copy()
    query.pop("page", None)
    return render(
        request,
        "platform/user_list.html",
        {
            "category": category,
            "category_label": config["label"],
            "directory_url": reverse(f"platform:{category}"),
            "filter_form": form,
            "page_obj": page_obj,
            "pagination_query": query.urlencode(),
            "can_create_staff": is_platform_super_admin(request.user)
            and category == "staff",
        },
    )


def _target_account(category, user_id):
    config = USER_CATEGORIES.get(category)
    if not config:
        return None
    return get_object_or_404(_accounts_for_category(category, config), pk=user_id)


@_platform_access_required
def user_detail(request, category, user_id):
    config = _category_for_request(request.user, category)
    if not config:
        return _forbidden(request, "Your role does not include access to this account.")
    target = _target_account(category, user_id)
    if category == "professionals":
        target = (
            User.objects.filter(role__in=config["roles"])
            .annotate(
                active_case_count=Count(
                    "case_assignments",
                    filter=Q(case_assignments__is_active=True),
                )
            )
            .get(pk=target.pk)
        )
    can_manage = is_platform_super_admin(request.user) or (
        category not in {"staff", "farmers"}
        and has_platform_permission(request.user, config["manage_permission"])
    )
    can_manage_roles = (
        target.role == User.Role.STAFF and is_platform_super_admin(request.user)
    )
    return render(
        request,
        "platform/user_detail.html",
        {
            "target": target,
            "category": category,
            "category_label": config["label"],
            "directory_url": reverse(f"platform:{category}"),
            "status_form": AccountStatusForm(
                initial={"account_status": target.account_status}
            )
            if can_manage
            else None,
            "can_manage": can_manage,
            "role_form": UserRoleForm(target=target) if can_manage_roles else None,
            "can_manage_roles": can_manage_roles,
            "assigned_roles": target.groups.filter(platform_role__isnull=False)
            .select_related("platform_role")
            .order_by("name"),
            "can_reset_password": is_platform_super_admin(request.user),
            "reset_form": SensitiveActionForm()
            if is_platform_super_admin(request.user)
            else None,
        },
    )


@_super_admin_required
def staff_create(request):
    form = StaffCreationForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        try:
            staff = create_staff_account(
                actor=request.user,
                data=form.cleaned_data,
            )
        except ValidationError as exc:
            form.add_error(None, exc)
        else:
            messages.success(
                request,
                f"Staff account created for {staff.email}. The account is active and can sign in with the initial password.",
            )
            return redirect("platform:user-detail", category="staff", user_id=staff.pk)
    return render(request, "platform/staff_form.html", {"form": form})


@_super_admin_required
@require_POST
def staff_permissions_update(request, user_id):
    staff = get_object_or_404(User, pk=user_id, role=User.Role.STAFF)
    form = StaffPermissionForm(request.POST, staff=staff)
    if not form.is_valid():
        messages.error(request, "Please correct the permission form and try again.")
        return redirect("platform:user-detail", category="staff", user_id=staff.pk)
    try:
        set_user_roles(
            actor=request.user,
            target=staff,
            roles=form.cleaned_data["roles"],
            reason=form.cleaned_data["reason"],
        )
    except ValidationError as exc:
        messages.error(request, "; ".join(exc.messages))
    else:
        messages.success(request, "Staff platform access roles updated.")
    return redirect("platform:user-detail", category="staff", user_id=staff.pk)


@_super_admin_required
@require_POST
def user_roles_update(request, category, user_id):
    target = get_object_or_404(User, pk=user_id)
    if target.role != User.Role.STAFF:
        messages.error(request, "RBAC roles can only be assigned to Staff accounts.")
        return redirect("platform:user-detail", category=category, user_id=target.pk)
    form = UserRoleForm(request.POST, target=target)
    if not form.is_valid():
        messages.error(request, "Correct the role assignment form and try again.")
        return redirect("platform:user-detail", category=category, user_id=target.pk)
    try:
        set_user_roles(
            actor=request.user,
            target=target,
            roles=form.cleaned_data["roles"],
            reason=form.cleaned_data["reason"],
        )
    except ValidationError as exc:
        messages.error(request, "; ".join(exc.messages))
    else:
        messages.success(request, "Roles updated.")
    return redirect("platform:user-detail", category=category, user_id=target.pk)


@_super_admin_required
def roles(request):
    role_rows = (
        Role.objects.select_related("group")
        .annotate(
            member_count=Count("group__user", distinct=True),
            permission_count=Count("group__permissions", distinct=True),
        )
        .order_by("group__name")
    )
    return render(
        request,
        "platform/roles.html",
        {
            "role_rows": role_rows,
            "can_manage_roles": True,
        },
    )


@_super_admin_required
def role_create(request):
    form = RoleForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        permissions = form.cleaned_data["permissions"]
        if not permissions:
            form.add_error("permissions", "Select at least one permission.")
        else:
            try:
                role = create_role(
                    actor=request.user,
                    name=form.cleaned_data["name"],
                    slug=form.cleaned_data["slug"],
                    description=form.cleaned_data["description"],
                    permissions=permissions,
                    is_assignable=form.cleaned_data["is_assignable"],
                    reason=form.cleaned_data["reason"],
                )
            except ValidationError as exc:
                form.add_error(None, exc)
            else:
                messages.success(request, f"Role \"{role.name}\" created.")
                return redirect("platform:role-detail", role_id=role.pk)
    return render(
        request,
        "platform/role_form.html",
        {
            "form": form,
            "page_title": "Create role",
            "back_url": reverse("platform:roles"),
            "submit_label": "Create role",
            "is_create": True,
        },
    )


@_super_admin_required
def role_detail(request, role_id):
    role = get_object_or_404(
        Role.objects.select_related("group").annotate(
            member_count=Count("group__user", distinct=True),
            permission_count=Count("group__permissions", distinct=True),
        ),
        pk=role_id,
    )
    permissions = role.permission_codenames
    can_edit_permissions = not role.is_system
    return render(
        request,
        "platform/role_detail.html",
        {
            "role": role,
            "permission_matrix": permission_matrix(permissions),
            "permission_form": RolePermissionForm(role=role)
            if can_edit_permissions
            else None,
            "member_form": RoleMemberForm(role=role),
            "members": role.group.user_set.filter(role=User.Role.STAFF).order_by("first_name", "last_name", "email"),
            "can_manage_roles": True,
            "can_edit_permissions": can_edit_permissions,
            "delete_form": SensitiveActionForm()
            if not role.is_system
            else None,
        },
    )


@_super_admin_required
def role_update(request, role_id):
    role = get_object_or_404(Role.objects.select_related("group"), pk=role_id)
    form = RoleForm(request.POST or None, role=role)
    if request.method == "POST" and form.is_valid():
        try:
            update_role(
                actor=request.user,
                role=role,
                name=form.cleaned_data["name"],
                slug=form.cleaned_data["slug"],
                description=form.cleaned_data["description"],
                is_assignable=form.cleaned_data["is_assignable"],
                reason=form.cleaned_data["reason"],
            )
        except ValidationError as exc:
            form.add_error(None, exc)
        else:
            messages.success(request, "Role details updated.")
            return redirect("platform:role-detail", role_id=role.pk)
    return render(
        request,
        "platform/role_form.html",
        {
            "form": form,
            "role": role,
            "page_title": f"Edit {role.name}",
            "back_url": reverse("platform:role-detail", args=[role.pk]),
            "submit_label": "Save role",
            "is_create": False,
        },
    )


@_super_admin_required
@require_POST
def role_permissions_update(request, role_id):
    role = get_object_or_404(Role.objects.select_related("group"), pk=role_id)
    form = RolePermissionForm(request.POST, role=role)
    if not form.is_valid():
        messages.error(request, "Correct the permission matrix and try again.")
        return redirect("platform:role-detail", role_id=role.pk)
    try:
        update_role_permissions(
            actor=request.user,
            role=role,
            permissions=form.cleaned_data["permissions"],
            reason=form.cleaned_data["reason"],
        )
    except ValidationError as exc:
        messages.error(request, "; ".join(exc.messages))
    else:
        messages.success(request, "Role permissions updated.")
    return redirect("platform:role-detail", role_id=role.pk)


@_super_admin_required
@require_POST
def role_members_update(request, role_id):
    role = get_object_or_404(Role.objects.select_related("group"), pk=role_id)
    form = RoleMemberForm(request.POST, role=role)
    if not form.is_valid():
        messages.error(request, "Correct the member selection and try again.")
        return redirect("platform:role-detail", role_id=role.pk)
    try:
        update_role_members(
            actor=request.user,
            role=role,
            users=form.cleaned_data["members"],
            reason=form.cleaned_data["reason"],
        )
    except ValidationError as exc:
        messages.error(request, "; ".join(exc.messages))
    else:
        messages.success(request, "Role members updated.")
    return redirect("platform:role-detail", role_id=role.pk)


@_super_admin_required
@require_POST
def role_delete(request, role_id):
    role = get_object_or_404(Role.objects.select_related("group"), pk=role_id)
    form = SensitiveActionForm(request.POST)
    if not form.is_valid():
        messages.error(request, "Confirm the deletion and provide a reason.")
        return redirect("platform:role-detail", role_id=role.pk)
    try:
        delete_role(
            actor=request.user,
            role=role,
            reason=form.cleaned_data["reason"],
        )
    except ValidationError as exc:
        messages.error(request, "; ".join(exc.messages))
        return redirect("platform:role-detail", role_id=role.pk)
    messages.success(request, "Role deleted.")
    return redirect("platform:roles")


@_platform_access_required
@require_POST
def account_status_update(request, category, user_id):
    config = _category_for_request(request.user, category)
    if not config:
        return _forbidden(request, "Your role does not include permission to change this account.")
    target = _target_account(category, user_id)
    if not (
        is_platform_super_admin(request.user)
        or (
            category not in {"staff", "farmers"}
            and has_platform_permission(request.user, config["manage_permission"])
        )
    ):
        return _forbidden(request, "Your role does not include permission to change this account.")

    form = AccountStatusForm(request.POST)
    if not form.is_valid():
        messages.error(request, "Confirm the change and provide a reason.")
        return redirect("platform:user-detail", category=category, user_id=target.pk)
    try:
        change_account_status(
            actor=request.user,
            target=target,
            account_status=form.cleaned_data["account_status"],
            reason=form.cleaned_data["reason"],
        )
    except ValidationError as exc:
        messages.error(request, "; ".join(exc.messages))
    else:
        messages.success(request, "Account status updated.")
    return redirect("platform:user-detail", category=category, user_id=target.pk)


@_super_admin_required
@require_POST
def account_password_reset(request, category, user_id):
    target = _target_account(category, user_id)
    if target is None:
        return _forbidden(request, "This account category is not available.")
    if target.account_status != User.AccountStatus.ACTIVE:
        messages.error(request, "Activate this account before requesting a password reset.")
        return redirect("platform:user-detail", category=category, user_id=target.pk)
    form = SensitiveActionForm(request.POST)
    if not form.is_valid():
        messages.error(request, "Confirm the password reset and provide a reason.")
        return redirect("platform:user-detail", category=category, user_id=target.pk)

    reset_form = PasswordResetForm(data={"email": target.email})
    if not reset_form.is_valid():
        messages.error(request, "A password reset could not be initiated for this account.")
        return redirect("platform:user-detail", category=category, user_id=target.pk)
    try:
        reset_form.save(
            request=request,
            use_https=request.is_secure(),
            email_template_name="registration/password_reset_email.html",
            subject_template_name="registration/password_reset_subject.txt",
        )
    except (OSError, smtplib.SMTPException, ImproperlyConfigured):
        messages.error(request, "The password reset email could not be sent. Check email configuration.")
        return redirect("platform:user-detail", category=category, user_id=target.pk)

    record_admin_action(
        actor=request.user,
        target_user=target,
        action="account_password_reset_requested",
        resource_type="user",
        resource_id=target.pk,
        reason=form.cleaned_data["reason"],
    )
    messages.success(request, "Password reset instructions were sent.")
    return redirect("platform:user-detail", category=category, user_id=target.pk)


@_permission_required("manage_reference_data")
def reference_data(request):
    stages = CropGrowthStage.objects.order_by("order", "name")
    return render(
        request,
        "platform/reference_data.html",
        {
            "stage_rows": [
                (stage, CropGrowthStageForm(instance=stage)) for stage in stages
            ],
            "form": CropGrowthStageForm(),
        },
    )


@_permission_required("manage_reference_data")
@require_POST
def reference_data_create(request):
    form = CropGrowthStageForm(request.POST)
    if not form.is_valid():
        messages.error(request, "Correct the crop growth stage details and try again.")
        return redirect("platform:reference-data")
    try:
        save_crop_growth_stage(actor=request.user, form=form)
    except ValidationError as exc:
        messages.error(request, "; ".join(exc.messages))
    else:
        messages.success(request, "Crop growth stage added.")
    return redirect("platform:reference-data")


@_permission_required("manage_reference_data")
@require_POST
def reference_data_update(request, stage_id):
    stage = get_object_or_404(CropGrowthStage, pk=stage_id)
    form = CropGrowthStageForm(request.POST, instance=stage)
    if not form.is_valid():
        messages.error(request, "Correct the crop growth stage details and try again.")
        return redirect("platform:reference-data")
    try:
        save_crop_growth_stage(actor=request.user, form=form, stage=stage)
    except ValidationError as exc:
        messages.error(request, "; ".join(exc.messages))
    else:
        messages.success(request, "Crop growth stage updated.")
    return redirect("platform:reference-data")


@_permission_required("view_admin_audit_log")
def audit_log(request):
    events = AdminAuditEvent.objects.select_related("actor", "target_user")
    query = request.GET.get("q", "").strip()
    if query:
        events = events.filter(
            Q(action__icontains=query)
            | Q(resource_type__icontains=query)
            | Q(resource_id__icontains=query)
            | Q(reason__icontains=query)
            | Q(actor__email__icontains=query)
            | Q(actor__first_name__icontains=query)
            | Q(actor__last_name__icontains=query)
            | Q(target_user__email__icontains=query)
            | Q(target_user__first_name__icontains=query)
            | Q(target_user__last_name__icontains=query)
        )
    page_obj = Paginator(events, 50).get_page(request.GET.get("page"))
    return render(
        request,
        "platform/audit_log.html",
        {"page_obj": page_obj, "query": query},
    )


@_permission_required("manage_community_content")
def community_moderation(request):
    if request.method == "POST":
        report = get_object_or_404(CommunityContentReport, pk=request.POST.get("report_id"))
        if report.status != CommunityContentReport.Status.PENDING:
            messages.info(request, "This community report has already been reviewed.")
            return redirect("platform:community-moderation")
        decision = request.POST.get("decision")
        if decision == "hide":
            if report.post_id:
                report.post.status = CommunityPost.Status.HIDDEN
                report.post.save(update_fields=["status", "updated_at"])
            else:
                report.reply.is_hidden = True
                report.reply.save(update_fields=["is_hidden", "updated_at"])
                if report.reply.post.accepted_reply_id == report.reply_id:
                    report.reply.post.accepted_reply = None
                    report.reply.post.status = CommunityPost.Status.OPEN
                    report.reply.post.save(update_fields=["accepted_reply", "status", "updated_at"])
            report.status = CommunityContentReport.Status.REVIEWED
            messages.success(request, "Content hidden from the farmer community.")
        elif decision == "dismiss":
            report.status = CommunityContentReport.Status.DISMISSED
            messages.success(request, "Report dismissed.")
        else:
            messages.error(request, "Choose whether to hide the content or dismiss the report.")
            return redirect("platform:community-moderation")
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.save(update_fields=["status", "reviewed_by", "reviewed_at"])
        return redirect("platform:community-moderation")

    reports = CommunityContentReport.objects.filter(
        status=CommunityContentReport.Status.PENDING
    ).select_related("post", "reply", "reporter")
    return render(
        request,
        "platform/community_moderation.html",
        {
            "page_obj": Paginator(reports, 20).get_page(request.GET.get("page")),
            "pending_count": reports.count(),
        },
    )
