from django import forms
from django.contrib.auth.forms import AuthenticationForm
from django.core.exceptions import ValidationError

from apps.accounts.permissions import has_platform_access
from apps.accounts.models import User
from apps.common.media import validate_private_image
from apps.reports.models import AgriculturalReport, ReportUpdate
from apps.reports.permissions import HANDLER_ROLES, is_report_coordinator
from apps.reports.services import (
    allowed_handler_roles,
    allowed_status_transitions,
    can_record_professional_updates,
    is_assigned_handler,
)


class StaffAuthenticationForm(AuthenticationForm):
    username = forms.EmailField(
        label="Email address",
        widget=forms.EmailInput(
            attrs={"autocomplete": "username", "autofocus": True}
        ),
    )

    def confirm_login_allowed(self, user):
        super().confirm_login_allowed(user)
        if user.account_status != User.AccountStatus.ACTIVE:
            raise ValidationError(
                self.error_messages["inactive"],
                code="inactive",
            )
        if (
            user.role not in HANDLER_ROLES
            and not is_report_coordinator(user)
            and not has_platform_access(user)
        ):
            raise ValidationError("This account does not have staff dashboard access.")


class CaseFilterForm(forms.Form):
    q = forms.CharField(
        label="Search",
        required=False,
        max_length=160,
        widget=forms.SearchInput(attrs={"placeholder": "Reference, farmer, or report"}),
    )
    category = forms.ChoiceField(
        required=False,
        choices=[("", "All categories")] + list(AgriculturalReport.Category.choices),
    )
    severity = forms.ChoiceField(
        required=False,
        choices=[("", "All severities")] + list(AgriculturalReport.Severity.choices),
    )
    status = forms.ChoiceField(
        required=False,
        choices=[("", "All statuses")] + list(AgriculturalReport.Status.choices),
    )


class StaffCaseUpdateForm(forms.Form):
    update_type = forms.ChoiceField(
        required=False,
        choices=[("", "Choose an update type")],
    )
    message = forms.CharField(
        required=False,
        max_length=10000,
        widget=forms.Textarea(attrs={"rows": 4, "placeholder": "Add a clear case update…"}),
    )
    visible_to_farmer = forms.BooleanField(
        required=False,
        initial=True,
        label="Visible to the farmer",
    )
    image = forms.ImageField(required=False, label="Attach an image")
    caption = forms.CharField(required=False, max_length=255, label="Image caption")

    def __init__(self, *, user, report, **kwargs):
        super().__init__(**kwargs)
        if is_report_coordinator(user) and not is_assigned_handler(report, user):
            self.fields.pop("image")
            self.fields.pop("caption")
        choices = [
            ReportUpdate.UpdateType.GENERAL,
            ReportUpdate.UpdateType.SITE_VISIT,
            ReportUpdate.UpdateType.INTERNAL_NOTE,
        ]
        if report.status in {
            AgriculturalReport.Status.ASSIGNED,
            AgriculturalReport.Status.IN_PROGRESS,
        }:
            choices.append(ReportUpdate.UpdateType.REQUEST_INFORMATION)
        if can_record_professional_updates(report, user):
            choices.extend([
                ReportUpdate.UpdateType.INVESTIGATION_FINDING,
                ReportUpdate.UpdateType.RECOMMENDATION,
                ReportUpdate.UpdateType.INTERVENTION,
            ])
            if report.status in {
                AgriculturalReport.Status.IN_PROGRESS,
                AgriculturalReport.Status.AWAITING_FARMER,
            }:
                choices.append(ReportUpdate.UpdateType.RESOLUTION_SUMMARY)
        self.fields["update_type"].choices = [("", "Choose an update type")] + [
            (value, ReportUpdate.UpdateType(value).label) for value in choices
        ]

    def clean_image(self):
        image = self.cleaned_data.get("image")
        if image:
            try:
                validate_private_image(image)
            except ValidationError as exc:
                raise forms.ValidationError(exc.messages) from exc
        return image

    def clean(self):
        cleaned_data = super().clean()
        update_type = cleaned_data.get("update_type")
        message = cleaned_data.get("message", "").strip()
        image = cleaned_data.get("image")
        has_update = bool(update_type or message)
        if has_update and not (update_type and message):
            raise forms.ValidationError(
                "Choose an update type and enter its message, or submit an image by itself."
            )
        if not has_update and not image:
            raise forms.ValidationError("Add a case update or attach an image.")
        return cleaned_data


class CaseAssignmentForm(forms.Form):
    assigned_user = forms.ModelChoiceField(
        queryset=User.objects.none(),
        label="Assign to",
        empty_label="Choose an eligible professional",
    )
    reason = forms.CharField(
        max_length=1000,
        widget=forms.Textarea(attrs={"rows": 3, "placeholder": "Why is this case assigned or transferred?"}),
    )

    def __init__(self, *, report, **kwargs):
        super().__init__(**kwargs)
        self.fields["assigned_user"].queryset = User.objects.filter(
            role__in=allowed_handler_roles(report),
            is_active=True,
            account_status=User.AccountStatus.ACTIVE,
        ).order_by("first_name", "last_name", "email")


class CaseTransitionForm(forms.Form):
    new_status = forms.ChoiceField(label="Move case to")
    reason = forms.CharField(
        max_length=1000,
        widget=forms.Textarea(attrs={"rows": 2, "placeholder": "Reason for this status change"}),
    )

    def __init__(self, *, report, user, **kwargs):
        super().__init__(**kwargs)
        allowed = allowed_status_transitions(report, user)
        choices = [
            (value, label)
            for value, label in AgriculturalReport.Status.choices
            if value in allowed
        ]
        self.fields["new_status"].choices = choices


class CaseReopenForm(forms.Form):
    reason = forms.CharField(
        max_length=1000,
        widget=forms.Textarea(attrs={"rows": 2, "placeholder": "Why should this case be reopened?"}),
    )
