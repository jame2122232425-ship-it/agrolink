from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import F, Q
from django.utils import timezone

from apps.common.storage import private_media_storage


class CropGrowthStage(models.Model):
    name = models.CharField(max_length=80, unique=True)
    order = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class Crop(models.Model):
    class AreaUnit(models.TextChoices):
        ACRES = "acres", "Acres"
        HECTARES = "hectares", "Hectares"
        SQUARE_METRES = "square_metres", "Square metres"

    class PlantingMethod(models.TextChoices):
        DIRECT_SEEDED = "direct_seeded", "Direct seeded"
        TRANSPLANTED = "transplanted", "Transplanted"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        HARVESTED = "harvested", "Harvested"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    farm = models.ForeignKey("farms.Farm", on_delete=models.CASCADE, related_name="crops")
    plot = models.ForeignKey(
        "farms.FarmPlot",
        on_delete=models.SET_NULL,
        related_name="crops",
        null=True,
        blank=True,
    )
    crop_name = models.CharField(max_length=100)
    variety = models.CharField(max_length=120, blank=True)
    planting_date = models.DateField(null=True, blank=True)
    expected_harvest_date = models.DateField(null=True, blank=True)
    actual_harvest_date = models.DateField(null=True, blank=True)
    area_planted = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    area_unit = models.CharField(max_length=16, choices=AreaUnit.choices, default=AreaUnit.ACRES)
    planting_method = models.CharField(
        max_length=16, choices=PlantingMethod.choices, blank=True
    )
    growth_stage = models.ForeignKey(
        CropGrowthStage,
        on_delete=models.SET_NULL,
        related_name="crops",
        null=True,
        blank=True,
    )
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True)
    image = models.ImageField(
        storage=private_media_storage, upload_to="crops/", null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(area_planted__gt=0), name="crop_area_positive"
            ),
            models.CheckConstraint(
                condition=(
                    Q(planting_date__isnull=True)
                    | Q(expected_harvest_date__isnull=True)
                    | Q(expected_harvest_date__gte=F("planting_date"))
                ),
                name="crop_expected_harvest_after_planting",
            ),
            models.CheckConstraint(
                condition=(
                    Q(planting_date__isnull=True)
                    | Q(actual_harvest_date__isnull=True)
                    | Q(actual_harvest_date__gte=F("planting_date"))
                ),
                name="crop_actual_harvest_after_planting",
            ),
        ]

    def clean(self):
        if self.plot_id and self.farm_id and self.plot.farm_id != self.farm_id:
            from django.core.exceptions import ValidationError

            raise ValidationError({"plot": "The selected plot must belong to this farm."})
        if (
            self.planting_date
            and self.expected_harvest_date
            and self.expected_harvest_date < self.planting_date
        ):
            from django.core.exceptions import ValidationError

            raise ValidationError(
                {"expected_harvest_date": "Expected harvest cannot precede planting."}
            )
        if (
            self.planting_date
            and self.actual_harvest_date
            and self.actual_harvest_date < self.planting_date
        ):
            from django.core.exceptions import ValidationError

            raise ValidationError(
                {"actual_harvest_date": "Actual harvest cannot precede planting."}
            )

    def __str__(self):
        return f"{self.crop_name} - {self.farm.name}"


class CropHealthObservation(models.Model):
    class Condition(models.TextChoices):
        UNKNOWN = "unknown", "Unknown"
        GOOD = "good", "Good"
        FAIR = "fair", "Fair"
        POOR = "poor", "Poor"

    class Severity(models.TextChoices):
        LOW = "low", "Low"
        MODERATE = "moderate", "Moderate"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    crop = models.ForeignKey(Crop, on_delete=models.CASCADE, related_name="health_observations")
    observation_date = models.DateField(default=timezone.localdate)
    symptoms_observed = models.TextField()
    general_condition = models.CharField(
        max_length=12, choices=Condition.choices, default=Condition.UNKNOWN
    )
    severity = models.CharField(max_length=12, choices=Severity.choices, default=Severity.LOW)
    notes = models.TextField(blank=True)
    image = models.ImageField(
        storage=private_media_storage,
        upload_to="crop-health/",
        null=True,
        blank=True,
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="crop_health_observations",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-observation_date", "-id"]

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.observation_date and self.observation_date > timezone.localdate():
            raise ValidationError({"observation_date": "Observation date cannot be in the future."})

    def __str__(self):
        return f"Crop observation: {self.crop_id} ({self.observation_date})"


class CropAssessment(models.Model):
    class AssessmentType(models.TextChoices):
        AI = "ai", "AI assessment"
        PROFESSIONAL = "professional", "Professional assessment"

    crop = models.ForeignKey(Crop, on_delete=models.CASCADE, related_name="assessments")
    observation = models.ForeignKey(
        CropHealthObservation,
        on_delete=models.SET_NULL,
        related_name="assessments",
        null=True,
        blank=True,
    )
    assessment_type = models.CharField(max_length=16, choices=AssessmentType.choices)
    assessment = models.TextField()
    diagnosis = models.TextField(blank=True)
    confidence = models.DecimalField(
        max_digits=4,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0")), MaxValueValidator(Decimal("1"))],
        null=True,
        blank=True,
    )
    assessed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="crop_assessments",
        null=True,
        blank=True,
    )
    assessed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-assessed_at"]

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.observation_id and self.observation.crop_id != self.crop_id:
            raise ValidationError({"observation": "The observation must belong to this crop."})


class CropActivity(models.Model):
    class ActivityType(models.TextChoices):
        PLANTING = "planting", "Planting"
        IRRIGATION = "irrigation", "Irrigation"
        FERTILIZER = "fertilizer", "Fertilizer application"
        WEEDING = "weeding", "Weeding"
        PEST_MANAGEMENT = "pest_management", "Pest management"
        DISEASE_MANAGEMENT = "disease_management", "Disease management"
        PRUNING = "pruning", "Pruning"
        HARVESTING = "harvesting", "Harvesting"
        OTHER = "other", "Other"

    crop = models.ForeignKey(Crop, on_delete=models.CASCADE, related_name="activities")
    activity_type = models.CharField(max_length=24, choices=ActivityType.choices)
    activity_date = models.DateField(default=timezone.localdate)
    description = models.TextField()
    product_or_treatment = models.CharField(max_length=160, blank=True)
    quantity = models.DecimalField(
        max_digits=12,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))],
        null=True,
        blank=True,
    )
    unit = models.CharField(max_length=32, blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="crop_activities",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-activity_date", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(quantity__isnull=True) | Q(quantity__gt=0),
                name="crop_activity_quantity_positive",
            )
        ]

    def __str__(self):
        return f"{self.get_activity_type_display()} - {self.crop_id}"
