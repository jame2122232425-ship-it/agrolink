from rest_framework.permissions import BasePermission

from apps.accounts.models import User
from apps.accounts.permissions import has_platform_permission, is_platform_super_admin


HANDLER_ROLES = {
    User.Role.AGRICULTURAL_OFFICER,
    User.Role.VETERINARY_OFFICER,
    User.Role.AGRONOMIST,
    User.Role.FIELD_AGENT,
}
def is_active_account(user):
    return (
        user
        and user.is_authenticated
        and user.is_active
        and user.account_status == User.AccountStatus.ACTIVE
    )


def is_report_coordinator(user):
    return is_active_account(user) and (
        is_platform_super_admin(user) or has_platform_permission(user, "coordinate_cases")
    )


class IsReportStaff(BasePermission):
    message = "An authorized report handler or coordinator account is required."

    def has_permission(self, request, view):
        return is_active_account(request.user) and (
            request.user.role in HANDLER_ROLES or is_report_coordinator(request.user)
        )


class IsReportCoordinator(BasePermission):
    message = "Only an authorized case coordinator can perform this action."

    def has_permission(self, request, view):
        return is_report_coordinator(request.user)


class CanReadReportEvidence(BasePermission):
    message = "Only the report owner or an assigned case handler can access evidence."

    def has_permission(self, request, view):
        user = request.user
        return is_active_account(user) and (
            user.role == User.Role.FARMER or user.role in HANDLER_ROLES
        )
