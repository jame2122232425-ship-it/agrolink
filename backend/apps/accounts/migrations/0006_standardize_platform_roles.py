from django.db import migrations


ROLE_DEFINITIONS = (
    (
        "Case Coordinators",
        "case-coordinators",
        "Triage the case queue, assign eligible officers, and monitor operational reports.",
        True,
        ("coordinate_cases", "view_operational_reports"),
    ),
    (
        "Farmer Account Support",
        "farmer-account-support",
        "View farmer accounts and profiles when providing account support.",
        True,
        ("view_farmer_accounts",),
    ),
    (
        "Professional Account Support",
        "professional-account-support",
        "View agricultural professional accounts and manage account status.",
        True,
        ("view_professional_accounts", "manage_professional_accounts"),
    ),
    (
        "Agricultural Data Managers",
        "agricultural-data-managers",
        "Review farm, crop, and livestock data and maintain agricultural reference data.",
        True,
        ("view_farm_oversight", "manage_reference_data"),
    ),
    (
        "Operational Reporting",
        "operational-reporting",
        "View reports and operational oversight dashboards.",
        True,
        ("view_operational_reports",),
    ),
    (
        "Platform Supervisors",
        "platform-supervisors",
        "Reserved system role. Platform-wide administration belongs to Super Admin accounts.",
        False,
        (
            "coordinate_cases",
            "view_farmer_accounts",
            "manage_farmer_accounts",
            "view_professional_accounts",
            "manage_professional_accounts",
            "manage_staff_permissions",
            "manage_reference_data",
            "view_operational_reports",
            "view_admin_audit_log",
        ),
    ),
)

PERMISSION_NAMES = {
    "coordinate_cases": "Can coordinate agricultural cases",
    "view_farmer_accounts": "Can view farmer accounts",
    "manage_farmer_accounts": "Can manage farmer account status",
    "view_professional_accounts": "Can view professional accounts",
    "manage_professional_accounts": "Can manage professional account status",
    "manage_staff_permissions": "Can manage delegated staff permissions",
    "view_farm_oversight": "Can view farm, crop, and livestock oversight data",
    "manage_reference_data": "Can manage agricultural reference data",
    "view_operational_reports": "Can view operational reports",
    "view_admin_audit_log": "Can view platform administration audit log",
}


def standardize_roles(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    Role = apps.get_model("accounts", "Role")
    ContentType = apps.get_model("contenttypes", "ContentType")
    database = schema_editor.connection.alias

    content_type, _ = ContentType.objects.using(database).get_or_create(
        app_label="accounts", model="user"
    )
    permissions = {}
    for codename, name in PERMISSION_NAMES.items():
        permission, _ = Permission.objects.using(database).get_or_create(
            content_type=content_type,
            codename=codename,
            defaults={"name": name},
        )
        permissions[codename] = permission

    for name, slug, description, assignable, codenames in ROLE_DEFINITIONS:
        group, _ = Group.objects.using(database).get_or_create(name=name)
        role, _ = Role.objects.using(database).get_or_create(
            group=group,
            defaults={
                "slug": slug,
                "description": description,
                "is_system": True,
                "is_assignable": assignable,
            },
        )
        role.slug = slug
        role.description = description
        role.is_system = True
        role.is_assignable = assignable
        role.save(using=database)
        group.permissions.set(
            [permissions[codename] for codename in codenames]
        )


class Migration(migrations.Migration):
    dependencies = [("accounts", "0005_farmerprofile_profile_picture")]

    operations = [migrations.RunPython(standardize_roles, migrations.RunPython.noop)]
