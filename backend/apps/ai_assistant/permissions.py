from rest_framework.permissions import BasePermission


class IsFarmer(BasePermission):
    message = "Only farmer accounts can use the agricultural assistant."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == request.user.Role.FARMER
        )
