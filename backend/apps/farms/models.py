from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class Farm(models.Model):
    class SizeUnit(models.TextChoices):
        ACRES = "acres", "Acres"
        HECTARES = "hectares", "Hectares"

    class FarmingType(models.TextChoices):
        MIXED = "mixed", "Mixed farming"
        CROPS = "crops", "Crop farming"
        LIVESTOCK = "livestock", "Livestock farming"

    farmer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="farms")
    name = models.CharField(max_length=150)
    location = models.CharField(max_length=255, blank=True)
    county = models.CharField(max_length=100, blank=True)
    sub_county = models.CharField(max_length=100, blank=True)
    ward = models.CharField(max_length=100, blank=True)
    village = models.CharField(max_length=100, blank=True)
    size = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    size_unit = models.CharField(max_length=10, choices=SizeUnit.choices, default=SizeUnit.ACRES)
    farming_type = models.CharField(max_length=16, choices=FarmingType.choices, default=FarmingType.MIXED)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self):
        return self.name


class FarmPlot(models.Model):
    class SoilType(models.TextChoices):
        CLAY = "clay", "Clay"
        LOAM = "loam", "Loam"
        SANDY = "sandy", "Sandy"
        SILT = "silt", "Silt"
        OTHER = "other", "Other"
        UNKNOWN = "unknown", "Unknown"

    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name="plots")
    name = models.CharField(max_length=150)
    size = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    soil_type = models.CharField(max_length=16, choices=SoilType.choices, default=SoilType.UNKNOWN)
    soil_ph = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        validators=[MinValueValidator(Decimal("0")), MaxValueValidator(Decimal("14"))],
        null=True,
        blank=True,
    )
    irrigation_enabled = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name", "id"]

    def __str__(self):
        return f"{self.farm.name} - {self.name}"


class FarmNote(models.Model):
    class Category(models.TextChoices):
        CROP = "crop", "Crop"
        DAIRY = "dairy", "Livestock"
        SOIL = "soil", "Soil"
        REPORT = "report", "Report"
        MARKET = "market", "Market"

    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="farm_notes",
        null=True,
        blank=True,
    )
    title = models.CharField(max_length=180)
    detail = models.TextField(blank=True)
    category = models.CharField(
        max_length=16, choices=Category.choices, default=Category.CROP
    )
    note_date = models.DateField(default=timezone.localdate)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-note_date", "-id"]

    def __str__(self):
        return f"{self.farm.name} note: {self.title}"
