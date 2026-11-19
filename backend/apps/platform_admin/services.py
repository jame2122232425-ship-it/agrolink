from django.contrib.auth.models import Group, Permission
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q

from apps.accounts.models import Role, User
from apps.accounts.permissions import (
    has_platform_permission,
    is_platform_super_admin,
    permission_codename_set,
)
from apps.crops.models import CropGrowthStage
from apps.platform_admin.models import AdminAuditEvent


def record_admin_action(
    *,
    actor,
    action,
    resource_type,
    resource_id="",
    target_user=None,
    reason="",
    changes=None,
):
    return AdminAuditEvent.objects.create(
        actor=actor,
        target_user=target_user,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        reason=reason,
        changes=changes or {},
    )


@transaction.atomic
def create_staff_account(*, actor, data):
    if not is_platform_super_admin(actor):
        raise ValidationError("Only a Super Admin can create Staff accounts.")
    roles = list(data.get("roles", ()))
    if not roles or any(not role.is_assignable for role in roles):
        raise ValidationError("Select at least one approved platform access role.")

    staff = User.objects.create_user(
        email=data["email"],
        password=data["password"],
        first_name=data["first_name"],
        last_name=data["last_name"],
        phone_number=data.get("phone_number", ""),
        role=User.Role.STAFF,
        account_status=User.AccountStatus.ACTIVE,
        is_staff=False,
    )
    staff.groups.set([role.group for role in roles])
    record_admin_action(
        actor=actor,
        target_user=staff,
        action="staff_account_created",
        resource_type="user",
        resource_id=staff.pk,
        reason=data["reason"],
        changes={"roles": sorted(role.name for role in roles)},
    )
    return staff


@transaction.atomic
def change_account_status(*, actor, target, account_status, reason):
    if account_status not in {
        User.AccountStatus.ACTIVE,
        User.AccountStatus.SUSPENDED,
    }:
        raise ValidationError("Choose a supported account status.")
    if not reason.strip():
        raise ValidationError("Provide a reason for the account status change.")
    target = User.objects.select_for_update().get(pk=target.pk)
    if not is_platform_super_admin(actor):
        if target.role == User.Role.FARMER:
            allowed = False
        elif target.role in {
            User.Role.AGRICULTURAL_OFFICER,
            User.Role.VETERINARY_OFFICER,
            User.Role.AGRONOMIST,
            User.Role.FIELD_AGENT,
        }:
            allowed = has_platform_permission(actor, "manage_professional_accounts")
        else:
            allowed = False
        if not allowed:
            raise ValidationError("You do not have permission to change this account status.")
    if target.pk == actor.pk and account_status != User.AccountStatus.ACTIVE:
        raise ValidationError("You cannot suspend your own account.")

    is_platform_admin = target.is_superuser or target.role == User.Role.PLATFORM_ADMIN
    if is_platform_admin and account_status != User.AccountStatus.ACTIVE:
        active_admins = list(
            User.objects.select_for_update()
            .filter(
                Q(is_superuser=True) | Q(role=User.Role.PLATFORM_ADMIN),
                is_active=True,
                account_status=User.AccountStatus.ACTIVE,
            )
            .values_list("pk", flat=True)
        )
        if len(active_admins) <= 1:
            raise ValidationError("The last active Super Admin cannot be suspended.")

    previous_status = target.account_status
    target.account_status = account_status
    target.is_active = account_status == User.AccountStatus.ACTIVE
    target.save(update_fields=["account_status", "is_active", "updated_at"])
    record_admin_action(
        actor=actor,
        target_user=target,
        action="account_status_changed",
        resource_type="user",
        resource_id=target.pk,
        reason=reason,
        changes={
            "account_status": {
                "before": previous_status,
                "after": target.account_status,
            }
        },
    )
    return target


@transaction.atomic
def save_crop_growth_stage(*, actor, form, stage=None):
    if not has_platform_permission(actor, "manage_reference_data"):
        raise ValidationError("You do not have permission to manage reference data.")
    if not form.cleaned_data["reason"].strip():
        raise ValidationError("Provide a reason for the reference-data change.")

    if stage is not None:
        stage = CropGrowthStage.objects.select_for_update().get(pk=stage.pk)
        previous = {
            "name": stage.name,
            "order": stage.order,
            "is_active": stage.is_active,
        }
    else:
        stage = CropGrowthStage()
        previous = None

    for field in ("name", "order", "is_active"):
        setattr(stage, field, form.cleaned_data[field])
    stage.full_clean()
    stage.save()
    current = {
        "name": stage.name,
        "order": stage.order,
        "is_active": stage.is_active,
    }
    record_admin_action(
        actor=actor,
        action="reference_data_updated" if previous else "reference_data_created",
        resource_type="crop_growth_stage",
        resource_id=stage.pk,
        reason=form.cleaned_data["reason"],
        changes={"before": previous, "after": current},
    )
    return stage


# ---------------------------------------------------------------------------
# Role-based access control
# ---------------------------------------------------------------------------


def _role_permissions(codenames):
    codenames = permission_codename_set(codenames)
    return list(
        Permission.objects.filter(
            content_type__app_label="accounts", codename__in=codenames
        )
    )


def assignable_roles():
    return Role.objects.select_related("group").filter(is_assignable=True)


def role_audit_snapshot(role):
    return {
        "name": role.name,
        "slug": role.slug,
        "description": role.description,
        "is_assignable": role.is_assignable,
        "permissions": sorted(role.permission_codenames),
    }


def _validate_role_name(*, name, role=None):
    name = (name or "").strip()
    if len(name) < 2:
        raise ValidationError("Enter a role name with at least 2 characters.")
    if len(name) > 150:
        raise ValidationError("Role names must be 150 characters or fewer.")
    existing = Group.objects.filter(name__iexact=name)
    if role is not None:
        existing = existing.exclude(pk=role.group_id)
    if existing.exists():
        raise ValidationError("A role with this name already exists.")
    return name


def _validate_role_slug(*, slug, role=None):
    slug = (slug or "").strip().lower()
    if not slug:
        raise ValidationError("Enter a role slug.")
    existing = Role.objects.filter(slug__iexact=slug)
    if role is not None:
        existing = existing.exclude(pk=role.pk)
    if existing.exists():
        raise ValidationError("A role with this slug already exists.")
    return slug


@transaction.atomic
def create_role(
    *,
    actor,
    name,
    slug,
    description="",
    permissions=(),
    is_assignable=True,
    reason="",
):
    if not is_platform_super_admin(actor):
        raise ValidationError("Only a Super Admin can create roles.")
    name = _validate_role_name(name=name)
    slug = _validate_role_slug(slug=slug)
    group = Group.objects.create(name=name)
    group.permissions.set(_role_permissions(permissions))
    role = Role.objects.create(
        group=group,
        slug=slug,
        description=(description or "").strip(),
        is_assignable=is_assignable,
    )
    record_admin_action(
        actor=actor,
        action="role_created",
        resource_type="role",
        resource_id=role.pk,
        reason=reason,
        changes={"after": role_audit_snapshot(role)},
    )
    return role


@transaction.atomic
def update_role(
    *,
    actor,
    role,
    name,
    slug,
    description="",
    is_assignable=True,
    reason="",
):
    if not is_platform_super_admin(actor):
        raise ValidationError("Only a Super Admin can edit roles.")
    role = Role.objects.select_for_update().select_related("group").get(pk=role.pk)
    previous = role_audit_snapshot(role)

    if role.is_system:
        if name.strip() != role.name:
            raise ValidationError("System roles cannot be renamed.")
        if slug.strip().lower() != role.slug:
            raise ValidationError("System roles cannot change their slug.")
        if bool(is_assignable) != role.is_assignable:
            raise ValidationError("System roles cannot change assignability.")
        name = role.name
        slug = role.slug
        is_assignable = role.is_assignable
    else:
        name = _validate_role_name(name=name, role=role)
        slug = _validate_role_slug(slug=slug, role=role)

    role.group.name = name
    role.group.full_clean()
    role.group.save(update_fields=["name"])
    role.slug = slug
    role.description = (description or "").strip()
    role.is_assignable = is_assignable
    role.save()
    record_admin_action(
        actor=actor,
        action="role_updated",
        resource_type="role",
        resource_id=role.pk,
        reason=reason,
        changes={"before": previous, "after": role_audit_snapshot(role)},
    )
    return role


@transaction.atomic
def update_role_permissions(*, actor, role, permissions, reason=""):
    if not is_platform_super_admin(actor):
        raise ValidationError("Only a Super Admin can change role permissions.")
    role = Role.objects.select_for_update().select_related("group").get(pk=role.pk)
    if role.is_system:
        raise ValidationError(
            "Built-in roles are locked. Create a custom role to use a different permission set."
        )
    selected = permission_codename_set(permissions)
    if not selected:
        raise ValidationError("Select at least one permission for this role.")
    if not reason.strip():
        raise ValidationError("Provide a reason for the permission change.")

    previous = sorted(role.permission_codenames)
    role.group.permissions.set(_role_permissions(selected))
    current = sorted(role.permission_codenames)
    record_admin_action(
        actor=actor,
        action="role_permissions_changed",
        resource_type="role",
        resource_id=role.pk,
        reason=reason,
        changes={"permissions": {"before": previous, "after": current}},
    )
    return role


@transaction.atomic
def delete_role(*, actor, role, reason=""):
    if not is_platform_super_admin(actor):
        raise ValidationError("Only a Super Admin can delete roles.")
    role = Role.objects.select_for_update().select_related("group").get(pk=role.pk)
    if role.is_system:
        raise ValidationError("System roles cannot be deleted.")
    if role.group.user_set.exists():
        raise ValidationError(
            "Reassign the members of this role before deleting it."
        )
    snapshot = role_audit_snapshot(role)
    group = role.group
    role.delete()
    group.delete()
    record_admin_action(
        actor=actor,
        action="role_deleted",
        resource_type="role",
        resource_id=snapshot.get("slug", ""),
        reason=reason,
        changes={"before": snapshot},
    )


@transaction.atomic
def set_user_roles(*, actor, target, roles, reason=""):
    if not is_platform_super_admin(actor):
        raise ValidationError("Only a Super Admin can assign roles.")
    if target.role != User.Role.STAFF:
        raise ValidationError("RBAC roles can only be assigned to Staff accounts.")
    if not reason.strip():
        raise ValidationError("Provide a reason for the role assignment.")

    roles = list(roles)
    if not roles:
        raise ValidationError("Assign at least one platform access role.")
    if any(not role.is_assignable for role in roles):
        raise ValidationError("One or more selected roles are not assignable.")

    target = User.objects.select_for_update().get(pk=target.pk)
    role_group_ids = set(Role.objects.values_list("group_id", flat=True))
    previous = sorted(
        target.groups.filter(pk__in=role_group_ids).values_list("name", flat=True)
    )
    target.groups.remove(*target.groups.filter(pk__in=role_group_ids))
    target.groups.add(*[role.group for role in roles])
    current = sorted(role.name for role in roles)
    record_admin_action(
        actor=actor,
        target_user=target,
        action="user_roles_changed",
        resource_type="user",
        resource_id=target.pk,
        reason=reason,
        changes={"roles": {"before": previous, "after": current}},
    )
    return target


@transaction.atomic
def update_role_members(*, actor, role, users, reason=""):
    if not is_platform_super_admin(actor):
        raise ValidationError("Only a Super Admin can manage role members.")
    role = Role.objects.select_for_update().select_related("group").get(pk=role.pk)
    if not role.is_assignable:
        raise ValidationError("This role cannot be assigned to Staff accounts.")
    if not reason.strip():
        raise ValidationError("Provide a reason for the membership change.")

    users = list(users)
    if any(user.role != User.Role.STAFF for user in users):
        raise ValidationError("RBAC roles can only be assigned to Staff accounts.")

    previous = sorted(role.group.user_set.values_list("email", flat=True))
    role.group.user_set.set(users)
    current = sorted(role.group.user_set.values_list("email", flat=True))
    for user in users:
        record_admin_action(
            actor=actor,
            target_user=user,
            action="user_roles_changed",
            resource_type="user",
            resource_id=user.pk,
            reason=reason,
            changes={"roles": {"before": previous, "after": current}},
        )
    return role

