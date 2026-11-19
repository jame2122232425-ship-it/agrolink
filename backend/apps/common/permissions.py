from rest_framework.permissions import BasePermission


class IsActiveAccount(BasePermission):
    message = "This account is not active."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.is_active
            and request.user.account_status == request.user.AccountStatus.ACTIVE
        )
