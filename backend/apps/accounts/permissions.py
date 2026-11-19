from apps.accounts.models import User


# Platform roles control access to the administrative site. Officer account
# types and active case assignments are enforced separately by reports.
PLATFORM_PERMISSION_GROUPS = (
    {
        "key": "cases",
        "label": "Case coordination",
        "description": "Review reports, triage the queue, assign cases, and monitor progress.",
        "permissions": (
            ("coordinate_cases", "Coordinate agricultural cases"),
            ("view_operational_reports", "View operational reports"),
        ),
    },
    {
        "key": "farmers",
        "label": "Farmer accounts",
        "description": "View farmer account directory and profile information.",
        "permissions": (
            ("view_farmer_accounts", "View farmer accounts"),
        ),
    },
    {
        "key": "professionals",
        "label": "Professional accounts",
        "description": "View professional accounts and manage their account status.",
        "permissions": (
            ("view_professional_accounts", "View professional accounts"),
            ("manage_professional_accounts", "Manage professional account status"),
        ),
    },
    {
        "key": "farm_data",
        "label": "Farm data oversight",
        "description": "Read aggregated and record-level farm, crop, and livestock data.",
        "permissions": (
            ("view_farm_oversight", "View farms, crops, and livestock records"),
        ),
    },
    {
        "key": "reference",
        "label": "Reference data",
        "description": "Maintain crop growth stages and other reference data.",
        "permissions": (
            ("manage_reference_data", "Manage agricultural reference data"),
        ),
    },
    {
        "key": "governance",
        "label": "Governance & audit",
        "description": "Review administrative audit history.",
        "permissions": (
            ("view_admin_audit_log", "View platform administration audit log"),
        ),
    },
    {
        "key": "community",
        "label": "Community moderation",
        "description": "Review farmer-submitted community content reports and hide harmful content.",
        "permissions": (
            ("manage_community_content", "Review and moderate community content"),
        ),
    },
)


PLATFORM_STAFF_PERMISSIONS = tuple(
    codename
    for group in PLATFORM_PERMISSION_GROUPS
    for codename, _label in group["permissions"]
)

PERMISSION_LABELS = {
    codename: label
    for group in PLATFORM_PERMISSION_GROUPS
    for codename, label in group["permissions"]
}


def permission_codename_set(codenames):
    """Return the intersection of ``codenames`` with the supported matrix."""

    requested = set(codenames or ())
    return requested.intersection(PLATFORM_STAFF_PERMISSIONS)


def permission_matrix(selected=()):
    """Build the grouped permission matrix with checked flags."""

    selected = set(selected or ())
    return [
        {
            **group,
            "permissions": [
                {
                    "codename": codename,
                    "label": label,
                    "checked": codename in selected,
                }
                for codename, label in group["permissions"]
            ],
        }
        for group in PLATFORM_PERMISSION_GROUPS
    ]


def _is_active_account(user):
    return (
        user
        and user.is_authenticated
        and user.is_active
        and user.account_status == User.AccountStatus.ACTIVE
    )


def is_platform_super_admin(user):
    return _is_active_account(user) and (
        user.is_superuser or user.role == User.Role.PLATFORM_ADMIN
    )


def has_platform_permission(user, codename):
    if not _is_active_account(user):
        return False
    if is_platform_super_admin(user):
        return True
    return (
        user.role == User.Role.STAFF
        and codename in PLATFORM_STAFF_PERMISSIONS
        and user.has_perm(f"accounts.{codename}")
    )


def has_platform_staff_access(user):
    return _is_active_account(user) and user.role == User.Role.STAFF and any(
        user.has_perm(f"accounts.{codename}") for codename in PLATFORM_STAFF_PERMISSIONS
    )


def has_platform_access(user):
    return is_platform_super_admin(user) or has_platform_staff_access(user)
