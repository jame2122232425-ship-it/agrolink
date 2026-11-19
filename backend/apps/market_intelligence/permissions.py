from rest_framework.permissions import BasePermission

from apps.accounts.models import User
from apps.accounts.permissions import has_platform_permission


class IsActiveMarketContributor(BasePermission):
    message = "Only active farmer or field-agent accounts can submit market data."

    def has_permission(self, request, view):
        user = request.user
        return (
            user.is_authenticated
            and user.is_active
            and user.account_status == User.AccountStatus.ACTIVE
            and user.role in {User.Role.FARMER, User.Role.FIELD_AGENT}
        )


class CanReviewMarketData(BasePermission):
    message = "You do not have permission to review market data."

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated or not user.is_active:
            return False
        if user.account_status != User.AccountStatus.ACTIVE:
            return False
        return user.role in {
            User.Role.AGRICULTURAL_OFFICER,
            User.Role.VETERINARY_OFFICER,
            User.Role.AGRONOMIST,
        } or has_platform_permission(user, "manage_reference_data")


class CanManageMarketImports(BasePermission):
    message = "You do not have permission to inspect market-data import batches."

    def has_permission(self, request, view):
        user = request.user
        return (
            user.is_authenticated
            and user.is_active
            and user.account_status == User.AccountStatus.ACTIVE
            and has_platform_permission(user, "manage_reference_data")
        )
