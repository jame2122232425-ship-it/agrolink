from django.contrib import admin

from apps.reports.models import (
    AgriculturalReport,
    CaseAssignment,
    ReportEvidence,
    ReportEvent,
    ReportUpdate,
)


class CaseAssignmentInline(admin.TabularInline):
    model = CaseAssignment
    extra = 0
    readonly_fields = ("assigned_at", "ended_at")


class ReportUpdateInline(admin.TabularInline):
    model = ReportUpdate
    extra = 0
    readonly_fields = ("author", "update_type", "message", "visible_to_farmer", "created_at")
    can_delete = False


class ReportEvidenceInline(admin.TabularInline):
    model = ReportEvidence
    extra = 0
    readonly_fields = ("uploaded_by", "uploaded_at")


@admin.register(AgriculturalReport)
class AgriculturalReportAdmin(admin.ModelAdmin):
    list_display = (
        "report_reference",
        "title",
        "farmer",
        "category",
        "severity",
        "status",
        "submitted_at",
    )
    list_filter = ("status", "category", "severity", "source", "submitted_at")
    search_fields = ("report_reference", "title", "farmer__email", "farm__name")
    readonly_fields = ("report_reference", "submitted_at", "updated_at")
    list_select_related = ("farmer", "farm")
    inlines = [CaseAssignmentInline, ReportUpdateInline, ReportEvidenceInline]


@admin.register(CaseAssignment)
class CaseAssignmentAdmin(admin.ModelAdmin):
    list_display = (
        "report",
        "assigned_user",
        "assigned_by",
        "assignment_role",
        "is_active",
        "assigned_at",
    )
    list_filter = ("assignment_role", "is_active", "assigned_at")
    search_fields = ("report__report_reference", "assigned_user__email", "assigned_by__email")
    list_select_related = ("report", "assigned_user", "assigned_by")


@admin.register(ReportUpdate)
class ReportUpdateAdmin(admin.ModelAdmin):
    list_display = ("report", "author", "update_type", "visible_to_farmer", "created_at")
    list_filter = ("update_type", "visible_to_farmer", "created_at")
    search_fields = ("report__report_reference", "message", "author__email")
    readonly_fields = ("created_at",)


@admin.register(ReportEvidence)
class ReportEvidenceAdmin(admin.ModelAdmin):
    list_display = ("report", "uploaded_by", "caption", "uploaded_at")
    search_fields = ("report__report_reference", "caption", "uploaded_by__email")
    readonly_fields = ("uploaded_at",)


@admin.register(ReportEvent)
class ReportEventAdmin(admin.ModelAdmin):
    list_display = ("report", "actor", "event_type", "created_at")
    list_filter = ("event_type", "created_at")
    search_fields = ("report__report_reference", "actor__email")
    readonly_fields = ("report", "actor", "event_type", "details", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
