from django.db import migrations


ROLE_SEEDS = (
    (
        "Case Coordinators",
        "case-coordinators",
        "Coordinate inbound agricultural cases and operational reporting.",
        True,
        True,
    ),
    (
        "Farmer Account Support",
        "farmer-account-support",
        "Review and manage farmer accounts.",
        True,
        True,
    ),
    (
        "Professional Account Support",
        "professional-account-support",
        "Review and manage agricultural professional accounts.",
        True,
        True,
    ),
    (
        "Agricultural Data Managers",
        "agricultural-data-managers",
        "Maintain crop growth stages and agricultural reference data.",
        True,
        True,
    ),
    (
        "Operational Reporting",
        "operational-reporting",
        "View operational reports and dashboards.",
        True,
        True,
    ),
    (
        "Platform Supervisors",
        "platform-supervisors",
        "Built-in role with every platform permission. Reserved for supervised staff access.",
        True,
        False,
    ),
)

ALL_PERMISSIONS = (
    "coordinate_cases",
    "view_farmer_accounts",
    "manage_farmer_accounts",
    "view_professional_accounts",
    "manage_professional_accounts",
    "manage_staff_permissions",
    "manage_reference_data",
    "view_operational_reports",
    "view_admin_audit_log",
)


def seed_roles(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    Role = apps.get_model("accounts", "Role")
    database = schema_editor.connection.alias

    permissions = {
        permission.codename: permission
        for permission in Permission.objects.using(database).filter(
            content_type__app_label="accounts",
            codename__in=ALL_PERMISSIONS,
        )
    }

    for name, slug, description, is_system, is_assignable in ROLE_SEEDS:
        group, _ = Group.objects.using(database).get_or_create(name=name)
        if name == "Platform Supervisors":
            group.permissions.set(permissions.values())
        Role.objects.using(database).get_or_create(
            group=group,
            defaults={
                "slug": slug,
                "description": description,
                "is_system": is_system,
                "is_assignable": is_assignable,
            },
        )


def unseed_roles(apps, schema_editor):
    Role = apps.get_model("accounts", "Role")
    database = schema_editor.connection.alias
    Role.objects.using(database).filter(
        slug__in=[seed[1] for seed in ROLE_SEEDS]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_role"),
    ]

    operations = [
        migrations.RunPython(seed_roles, unseed_roles),
    ]
