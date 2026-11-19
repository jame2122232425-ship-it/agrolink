import uuid

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.accounts.models import User
from apps.common.storage import private_media_storage


def generate_report_reference():
    return f"AGL-{timezone.now():%Y}-{uuid.uuid4().hex.upper()}"


class AgriculturalReport(models.Model):
    class Category(models.TextChoices):
        CROP_HEALTH = "crop_health", "Crop health"
        LIVESTOCK_HEALTH = "livestock_health", "Livestock health"
        PEST_DISEASE = "pest_disease", "Pest or disease"
        SOIL = "soil", "Soil"
        WATER_IRRIGATION = "water_irrigation", "Water and irrigation"
        WEATHER_CLIMATE = "weather_climate", "Weather or climate damage"
        INFRASTRUCTURE = "infrastructure", "Farm infrastructure"
        OTHER = "other", "Other agricultural issue"

    class Severity(models.TextChoices):
        LOW = "low", "Low"
        MODERATE = "moderate", "Moderate"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    class Status(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        UNDER_REVIEW = "under_review", "Under review"
        ASSIGNED = "assigned", "Assigned"
        IN_PROGRESS = "in_progress", "In progress"
        AWAITING_FARMER = "awaiting_farmer", "Awaiting farmer"
        RESOLVED = "resolved", "Resolved"
        CLOSED = "closed", "Closed"
        REJECTED = "rejected", "Rejected"
        DUPLICATE = "duplicate", "Duplicate"

    class Source(models.TextChoices):
        FARMER_APP = "farmer_app", "Farmer app"
        ASSISTED_FIELD = "assisted_field", "Assisted field submission"

    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="agricultural_reports",
    )
    farm = models.ForeignKey(
        "farms.Farm", on_delete=models.PROTECT, related_name="agricultural_reports"
    )
    plot = models.ForeignKey(
        "farms.FarmPlot",
        on_delete=models.SET_NULL,
        related_name="agricultural_reports",
        null=True,
        blank=True,
    )
    crop = models.ForeignKey(
        "crops.Crop",
        on_delete=models.SET_NULL,
        related_name="agricultural_reports",
        null=True,
        blank=True,
    )
    livestock_group = models.ForeignKey(
        "livestock.LivestockGroup",
        on_delete=models.SET_NULL,
        related_name="agricultural_reports",
        null=True,
        blank=True,
    )
    animal = models.ForeignKey(
        "livestock.Animal",
        on_delete=models.SET_NULL,
        related_name="agricultural_reports",
        null=True,
        blank=True,
    )
    report_reference = models.CharField(
        max_length=45, unique=True, default=generate_report_reference, editable=False
    )
    title = models.CharField(max_length=180)
    description = models.TextField(max_length=10000)
    category = models.CharField(max_length=24, choices=Category.choices)
    severity = models.CharField(max_length=12, choices=Severity.choices, default=Severity.MODERATE)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.SUBMITTED
    )
    source = models.CharField(max_length=20, choices=Source.choices, default=Source.FARMER_APP)
    location_details = models.CharField(max_length=255, blank=True)
    resolution_summary = models.TextField(blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-submitted_at", "-id"]
        indexes = [
            models.Index(fields=["farmer", "status", "submitted_at"]),
            models.Index(fields=["category", "severity", "submitted_at"]),
        ]

    def clean(self):
        errors = {}
        if self.farm_id and self.farmer_id and self.farm.farmer_id != self.farmer_id:
            errors["farm"] = "The farm must belong to the submitting farmer."
        if self.plot_id and self.farm_id and self.plot.farm_id != self.farm_id:
            errors["plot"] = "The selected plot must belong to this farm."
        if self.crop_id and self.farm_id and self.crop.farm_id != self.farm_id:
            errors["crop"] = "The selected crop must belong to this farm."
        if (
            self.livestock_group_id
            and self.farm_id
            and self.livestock_group.farm_id != self.farm_id
        ):
            errors["livestock_group"] = "The livestock group must belong to this farm."
        if self.animal_id and self.farm_id and self.animal.farm_id != self.farm_id:
            errors["animal"] = "The animal must belong to this farm."
        if self.crop_id and (self.livestock_group_id or self.animal_id):
            errors["crop"] = "A report cannot link crop and livestock records together."
        if (
            self.livestock_group_id
            and self.animal_id
            and self.animal.group_id != self.livestock_group_id
        ):
            errors["animal"] = "The animal must belong to the selected livestock group."

        has_livestock = bool(self.livestock_group_id or self.animal_id)
        crop_categories = {
            self.Category.CROP_HEALTH,
            self.Category.SOIL,
            self.Category.WATER_IRRIGATION,
            self.Category.WEATHER_CLIMATE,
            self.Category.INFRASTRUCTURE,
        }
        if self.category in crop_categories and has_livestock:
            errors["category"] = "This report category cannot reference livestock records."
        if (
            self.category == self.Category.LIVESTOCK_HEALTH
            and self.crop_id
        ):
            errors["crop"] = "A livestock-health report cannot reference a crop."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.report_reference} - {self.title}"


class CaseAssignment(models.Model):
    report = models.ForeignKey(
        AgriculturalReport, on_delete=models.CASCADE, related_name="assignments"
    )
    assigned_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="case_assignments",
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_case_assignments",
    )
    assignment_role = models.CharField(max_length=32, choices=User.Role.choices)
    assigned_at = models.DateTimeField(auto_now_add=True)
    reason = models.CharField(max_length=1000)
    is_active = models.BooleanField(default=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    end_reason = models.CharField(max_length=1000, blank=True)

    class Meta:
        ordering = ["-assigned_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["report"],
                condition=Q(is_active=True),
                name="one_active_assignment_per_report",
            )
        ]

    def clean(self):
        if self.assigned_user_id and self.assignment_role != self.assigned_user.role:
            raise ValidationError(
                {"assignment_role": "Assignment role must match the assigned user's role."}
            )

    def __str__(self):
        return f"{self.report.report_reference} -> {self.assigned_user_id}"


class ReportUpdate(models.Model):
    class UpdateType(models.TextChoices):
        GENERAL = "general", "General progress update"
        REQUEST_INFORMATION = "request_information", "Request for farmer information"
        FARMER_CLARIFICATION = "farmer_clarification", "Farmer clarification"
        SITE_VISIT = "site_visit", "Site visit"
        INVESTIGATION_FINDING = "investigation_finding", "Investigation finding"
        RECOMMENDATION = "recommendation", "Recommendation"
        INTERVENTION = "intervention", "Intervention or action taken"
        RESOLUTION_SUMMARY = "resolution_summary", "Resolution summary"
        REASSIGNMENT_NOTE = "reassignment_note", "Reassignment note"
        INTERNAL_NOTE = "internal_note", "Internal note"

    report = models.ForeignKey(
        AgriculturalReport, on_delete=models.CASCADE, related_name="updates"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="agricultural_report_updates",
        null=True,
    )
    update_type = models.CharField(max_length=24, choices=UpdateType.choices)
    message = models.TextField(max_length=10000)
    visible_to_farmer = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValidationError("Report updates are append-only.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Report updates are append-only.")

    def __str__(self):
        return f"{self.get_update_type_display()} - {self.report.report_reference}"


class ReportEvidence(models.Model):
    report = models.ForeignKey(
        AgriculturalReport, on_delete=models.CASCADE, related_name="evidence"
    )
    image = models.ImageField(
        storage=private_media_storage,
        upload_to="reports/evidence/",
    )
    caption = models.CharField(max_length=255, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="report_evidence_uploads",
        null=True,
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["uploaded_at", "id"]

    def __str__(self):
        return f"Evidence for {self.report.report_reference}"


class ReportEvent(models.Model):
    class EventType(models.TextChoices):
        SUBMITTED = "submitted", "Report submitted"
        STATUS_CHANGED = "status_changed", "Status changed"
        ASSIGNED = "assigned", "Assigned"
        REASSIGNED = "reassigned", "Reassigned"
        UPDATE_CREATED = "update_created", "Case update created"
        EVIDENCE_ADDED = "evidence_added", "Evidence added"
        REOPENED = "reopened", "Reopened"

    report = models.ForeignKey(
        AgriculturalReport, on_delete=models.CASCADE, related_name="events"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="agricultural_report_events",
        null=True,
    )
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    details = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValidationError("Report events are append-only.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Report events are append-only.")

    def __str__(self):
        return f"{self.get_event_type_display()} - {self.report.report_reference}"
