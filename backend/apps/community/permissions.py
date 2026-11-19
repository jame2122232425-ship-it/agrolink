from rest_framework.permissions import BasePermission

from apps.accounts.models import User
from apps.accounts.permissions import has_platform_permission


class IsActiveFarmer(BasePermission):
    message = "An active farmer account is required to use the community."

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.is_active
            and user.account_status == User.AccountStatus.ACTIVE
            and user.role == User.Role.FARMER
        )


class CanModerateCommunity(BasePermission):
    message = "Community moderation permission is required."

    def has_permission(self, request, view):
        return has_platform_permission(request.user, "manage_community_content")
