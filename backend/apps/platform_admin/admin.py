from django.contrib import admin

from apps.platform_admin.models import AdminAuditEvent


@admin.register(AdminAuditEvent)
class AdminAuditEventAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "actor",
        "action",
        "resource_type",
        "resource_id",
        "target_user",
    )
    list_filter = ("action", "resource_type", "created_at")
    search_fields = (
        "actor__email",
        "target_user__email",
        "resource_type",
        "resource_id",
        "reason",
    )
    readonly_fields = (
        "actor",
        "target_user",
        "action",
        "resource_type",
        "resource_id",
        "reason",
        "changes",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
