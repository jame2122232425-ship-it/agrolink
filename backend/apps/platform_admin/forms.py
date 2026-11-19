from django import forms
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError

from apps.accounts.models import Role, User
from apps.accounts.permissions import PLATFORM_PERMISSION_GROUPS
from apps.crops.models import CropGrowthStage


class ReasonFormMixin:
    def clean_reason(self):
        reason = self.cleaned_data["reason"].strip()
        if len(reason) < 8:
            raise ValidationError("Enter a reason with at least 8 characters.")
        return reason


class DirectoryFilterForm(forms.Form):
    q = forms.CharField(
        required=False,
        max_length=160,
        label="Search",
        widget=forms.SearchInput(attrs={"placeholder": "Name or email"}),
    )
    status = forms.ChoiceField(
        required=False,
        choices=[("", "All statuses")] + list(User.AccountStatus.choices),
    )


class StaffCreationForm(ReasonFormMixin, forms.Form):
    first_name = forms.CharField(max_length=150)
    last_name = forms.CharField(max_length=150)
    email = forms.EmailField()
    phone_number = forms.CharField(max_length=32, required=False)
    password = forms.CharField(
        label="Initial password",
        strip=False,
        widget=forms.PasswordInput(attrs={"autocomplete": "new-password"}),
        help_text="The staff member will use this password to sign in. It must meet the configured password requirements.",
    )
    password_confirm = forms.CharField(
        label="Confirm password",
        strip=False,
        widget=forms.PasswordInput(attrs={"autocomplete": "new-password"}),
    )
    roles = forms.ModelMultipleChoiceField(
        queryset=Role.objects.none(),
        required=True,
        label="Platform access roles",
        widget=forms.CheckboxSelectMultiple,
    )
    reason = forms.CharField(
        max_length=1000,
        widget=forms.Textarea(attrs={"rows": 3}),
        help_text="Record why this administrative Staff account is being created.",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["roles"].queryset = Role.objects.select_related("group").filter(
            is_assignable=True
        ).order_by("group__name")

    def clean_email(self):
        email = self.cleaned_data["email"].strip().lower()
        if User.objects.filter(email__iexact=email).exists():
            raise ValidationError("An account with this email already exists.")
        return email

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        password_confirm = cleaned_data.get("password_confirm")
        if password and password_confirm and password != password_confirm:
            self.add_error("password_confirm", "The passwords do not match.")
        if password:
            candidate = User(
                email=cleaned_data.get("email", ""),
                first_name=cleaned_data.get("first_name", ""),
                last_name=cleaned_data.get("last_name", ""),
            )
            try:
                validate_password(password, user=candidate)
            except ValidationError as exc:
                self.add_error("password", exc)
        return cleaned_data


class StaffPermissionForm(ReasonFormMixin, forms.Form):
    roles = forms.ModelMultipleChoiceField(
        queryset=Role.objects.none(),
        required=True,
        label="Platform access roles",
        widget=forms.CheckboxSelectMultiple,
    )
    reason = forms.CharField(
        max_length=1000,
        widget=forms.Textarea(attrs={"rows": 3}),
        help_text="Record why this staff account's platform roles are changing.",
    )

    def __init__(self, *args, staff, **kwargs):
        super().__init__(*args, **kwargs)
        self.staff = staff
        self.fields["roles"].queryset = Role.objects.select_related("group").filter(
            is_assignable=True
        ).order_by("group__name")
        if not self.is_bound:
            self.initial["roles"] = staff.groups.filter(platform_role__isnull=False)

    def clean(self):
        cleaned_data = super().clean()
        if self.staff.role != User.Role.STAFF:
            raise ValidationError("Platform access roles can only be assigned to Staff.")
        return cleaned_data


class AccountStatusForm(ReasonFormMixin, forms.Form):
    account_status = forms.ChoiceField(
        choices=(
            (User.AccountStatus.ACTIVE, "Active"),
            (User.AccountStatus.SUSPENDED, "Suspended"),
        ),
        label="New account status",
    )
    reason = forms.CharField(
        max_length=1000,
        widget=forms.Textarea(attrs={"rows": 3}),
        help_text="A reason is required and will be included in the audit record.",
    )
    confirm = forms.BooleanField(
        required=True,
        label="I confirm this account status change.",
    )


class SensitiveActionForm(ReasonFormMixin, forms.Form):
    reason = forms.CharField(
        max_length=1000,
        widget=forms.Textarea(attrs={"rows": 3}),
    )
    confirm = forms.BooleanField(
        required=True,
        label="I confirm this action.",
    )


class CropGrowthStageForm(ReasonFormMixin, forms.ModelForm):
    reason = forms.CharField(
        max_length=1000,
        widget=forms.Textarea(attrs={"rows": 2}),
        help_text="Record why this reference-data change is needed.",
    )

    class Meta:
        model = CropGrowthStage
        fields = ("name", "order", "is_active")


def permission_choices():
    return [
        (
            group["label"],
            [
                (codename, label)
                for codename, label in group["permissions"]
            ],
        )
        for group in PLATFORM_PERMISSION_GROUPS
    ]


class RoleForm(ReasonFormMixin, forms.Form):
    name = forms.CharField(
        max_length=150,
        help_text="Shown in the role list and on member profiles.",
    )
    slug = forms.SlugField(
        max_length=80,
        help_text="Stable identifier used in URLs and audit records.",
    )
    description = forms.CharField(
        required=False,
        max_length=500,
        widget=forms.Textarea(attrs={"rows": 2}),
        help_text="Explain what this role is for.",
    )
    is_assignable = forms.BooleanField(
        required=False,
        initial=True,
        label="Can be assigned to Staff accounts",
    )
    permissions = forms.MultipleChoiceField(
        choices=(),
        required=False,
        label="Initial permissions",
        widget=forms.CheckboxSelectMultiple,
    )
    reason = forms.CharField(
        max_length=1000,
        widget=forms.Textarea(attrs={"rows": 2}),
        help_text="Record why this role is being created or changed.",
    )

    def __init__(self, *args, role=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.role = role
        self.fields["permissions"].choices = permission_choices()
        if role is not None:
            for field in ("name", "slug", "is_assignable"):
                self.fields[field].disabled = True
                self.fields[field].help_text = "System roles are locked."
            self.fields["permissions"].disabled = True
            self.fields["permissions"].help_text = (
                "Edit permissions from the role detail screen."
            )
            if not self.is_bound:
                self.initial.update(
                    {
                        "name": role.name,
                        "slug": role.slug,
                        "description": role.description,
                        "is_assignable": role.is_assignable,
                    }
                )

    def clean_name(self):
        name = self.cleaned_data["name"].strip()
        existing = Group.objects.filter(name__iexact=name)
        if self.role is not None:
            existing = existing.exclude(pk=self.role.group_id)
        if existing.exists():
            raise ValidationError("A role with this name already exists.")
        return name

    def clean_slug(self):
        slug = self.cleaned_data["slug"].strip().lower()
        existing = Role.objects.filter(slug__iexact=slug)
        if self.role is not None:
            existing = existing.exclude(pk=self.role.pk)
        if existing.exists():
            raise ValidationError("A role with this slug already exists.")
        return slug


class RolePermissionForm(ReasonFormMixin, forms.Form):
    permissions = forms.MultipleChoiceField(
        choices=(),
        required=True,
        label="Permissions",
        widget=forms.CheckboxSelectMultiple,
    )
    reason = forms.CharField(
        max_length=1000,
        widget=forms.Textarea(attrs={"rows": 3}),
        help_text="Record why this role's permissions are changing.",
    )

    def __init__(self, *args, role=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.role = role
        self.fields["permissions"].choices = permission_choices()
        if role is not None and not self.is_bound:
            self.initial["permissions"] = sorted(role.permission_codenames)


class RoleMemberForm(ReasonFormMixin, forms.Form):
    members = forms.ModelMultipleChoiceField(
        queryset=User.objects.none(),
        required=False,
        label="Staff members",
        widget=forms.CheckboxSelectMultiple,
    )
    reason = forms.CharField(
        max_length=1000,
        widget=forms.Textarea(attrs={"rows": 3}),
        help_text="Record why the members of this role are changing.",
    )

    def __init__(self, *args, role, **kwargs):
        super().__init__(*args, **kwargs)
        self.role = role
        self.fields["members"].queryset = User.objects.filter(
            role=User.Role.STAFF
        ).order_by("first_name", "last_name", "email")
        if not self.is_bound:
            self.initial["members"] = role.group.user_set.all()


class UserRoleForm(ReasonFormMixin, forms.Form):
    roles = forms.ModelMultipleChoiceField(
        queryset=Role.objects.none(),
        required=False,
        label="Roles",
        widget=forms.CheckboxSelectMultiple,
    )
    reason = forms.CharField(
        max_length=1000,
        widget=forms.Textarea(attrs={"rows": 3}),
        help_text="Record why this account's roles are changing.",
    )

    def __init__(self, *args, target=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.target = target
        self.fields["roles"].queryset = Role.objects.select_related("group").filter(
            is_assignable=True
        ).order_by("group__name")
        if target is not None and not self.is_bound:
            self.initial["roles"] = target.groups.filter(
                platform_role__isnull=False
            )
