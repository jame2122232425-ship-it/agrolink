from rest_framework.permissions import BasePermission

from apps.accounts.models import User


class FarmerOnly(BasePermission):
    message = "Only farmer accounts can manage farmer-facing farm records."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == User.Role.FARMER
            and request.user.account_status == User.AccountStatus.ACTIVE
        )
