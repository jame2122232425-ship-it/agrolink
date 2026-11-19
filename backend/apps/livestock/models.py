from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone

from apps.common.storage import private_media_storage


class LivestockGroup(models.Model):
    farm = models.ForeignKey(
        "farms.Farm", on_delete=models.CASCADE, related_name="livestock_groups"
    )
    species = models.CharField(max_length=80)
    breed = models.CharField(max_length=100, blank=True)
    group_name = models.CharField(max_length=120)
    animal_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    production_purpose = models.CharField(max_length=120, blank=True)
    acquisition_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    image = models.ImageField(
        storage=private_media_storage, upload_to="livestock-groups/", null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["species", "group_name", "id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(animal_count__gte=0), name="livestock_group_count_nonnegative"
            )
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        if self.acquisition_date and self.acquisition_date > timezone.localdate():
            raise ValidationError({"acquisition_date": "Acquisition date cannot be in the future."})

    def __str__(self):
        return f"{self.group_name} ({self.species})"


class Animal(models.Model):
    class Sex(models.TextChoices):
        FEMALE = "female", "Female"
        MALE = "male", "Male"
        UNKNOWN = "unknown", "Unknown"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        SOLD = "sold", "Sold"
        DECEASED = "deceased", "Deceased"
        MISSING = "missing", "Missing"
        SLAUGHTERED = "slaughtered", "Slaughtered"

    farm = models.ForeignKey("farms.Farm", on_delete=models.CASCADE, related_name="animals")
    group = models.ForeignKey(
        LivestockGroup,
        on_delete=models.SET_NULL,
        related_name="animals",
        null=True,
        blank=True,
    )
    identification_number = models.CharField(max_length=80, blank=True)
    name_or_tag = models.CharField(max_length=120, blank=True)
    species = models.CharField(max_length=80)
    breed = models.CharField(max_length=100, blank=True)
    sex = models.CharField(max_length=8, choices=Sex.choices, default=Sex.UNKNOWN)
    birth_date = models.DateField(null=True, blank=True)
    estimated_age_months = models.PositiveSmallIntegerField(null=True, blank=True)
    acquisition_date = models.DateField(null=True, blank=True)
    production_purpose = models.CharField(max_length=120, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    notes = models.TextField(blank=True)
    image = models.ImageField(
        storage=private_media_storage, upload_to="livestock-animals/", null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["species", "name_or_tag", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["farm", "identification_number"],
                condition=~Q(identification_number=""),
                name="unique_animal_identifier_per_farm",
            )
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        errors = {}
        if self.group_id and self.farm_id and self.group.farm_id != self.farm_id:
            errors["group"] = "The livestock group must belong to this farm."
        if (
            self.group_id
            and self.species
            and self.group.species.strip().casefold() != self.species.strip().casefold()
        ):
            errors["species"] = "The animal species must match its group."
        if self.birth_date and self.birth_date > timezone.localdate():
            errors["birth_date"] = "Birth date cannot be in the future."
        if self.acquisition_date and self.acquisition_date > timezone.localdate():
            errors["acquisition_date"] = "Acquisition date cannot be in the future."
        if (
            self.birth_date
            and self.acquisition_date
            and self.acquisition_date < self.birth_date
        ):
            errors["acquisition_date"] = "Acquisition date cannot precede birth date."
        if self.birth_date and self.estimated_age_months is not None:
            errors["estimated_age_months"] = "Provide birth date or estimated age, not both."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return self.name_or_tag or self.identification_number or f"{self.species} #{self.pk}"


class LivestockHealthObservation(models.Model):
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

    animal = models.ForeignKey(
        Animal,
        on_delete=models.CASCADE,
        related_name="health_observations",
        null=True,
        blank=True,
    )
    group = models.ForeignKey(
        LivestockGroup,
        on_delete=models.CASCADE,
        related_name="health_observations",
        null=True,
        blank=True,
    )
    observation_date = models.DateField(default=timezone.localdate)
    symptoms_reported = models.TextField()
    general_condition = models.CharField(
        max_length=12, choices=Condition.choices, default=Condition.UNKNOWN
    )
    severity = models.CharField(max_length=12, choices=Severity.choices, default=Severity.LOW)
    farmer_notes = models.TextField(blank=True)
    image = models.ImageField(
        storage=private_media_storage,
        upload_to="livestock-health/",
        null=True,
        blank=True,
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="livestock_health_observations",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-observation_date", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(animal__isnull=False, group__isnull=True)
                    | Q(animal__isnull=True, group__isnull=False)
                ),
                name="livestock_health_exactly_one_subject",
            )
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        if bool(self.animal_id) == bool(self.group_id):
            raise ValidationError("Select exactly one animal or livestock group.")
        if self.observation_date and self.observation_date > timezone.localdate():
            raise ValidationError({"observation_date": "Observation date cannot be in the future."})

    def __str__(self):
        return f"Livestock observation ({self.observation_date})"


class LivestockAssessment(models.Model):
    class AssessmentType(models.TextChoices):
        AI = "ai", "AI assessment"
        PROFESSIONAL = "professional", "Professional assessment"

    animal = models.ForeignKey(
        Animal, on_delete=models.CASCADE, related_name="assessments", null=True, blank=True
    )
    group = models.ForeignKey(
        LivestockGroup,
        on_delete=models.CASCADE,
        related_name="assessments",
        null=True,
        blank=True,
    )
    observation = models.ForeignKey(
        LivestockHealthObservation,
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
        validators=[
            MinValueValidator(Decimal("0")),
            MaxValueValidator(Decimal("1")),
        ],
        null=True,
        blank=True,
    )
    assessed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="livestock_assessments",
        null=True,
        blank=True,
    )
    assessed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-assessed_at"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(animal__isnull=False, group__isnull=True)
                    | Q(animal__isnull=True, group__isnull=False)
                ),
                name="livestock_assessment_exactly_one_subject",
            )
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        if bool(self.animal_id) == bool(self.group_id):
            raise ValidationError("Select exactly one animal or livestock group.")
        if self.observation_id:
            if self.animal_id != self.observation.animal_id or self.group_id != self.observation.group_id:
                raise ValidationError({"observation": "The observation must belong to this subject."})


class LivestockMedicalRecord(models.Model):
    class RecordType(models.TextChoices):
        VACCINATION = "vaccination", "Vaccination"
        TREATMENT = "treatment", "Treatment"

    class EntryType(models.TextChoices):
        FARMER_REPORTED = "farmer_reported", "Farmer-reported history"
        PROFESSIONAL = "professional", "Administered by a professional"

    animal = models.ForeignKey(
        Animal,
        on_delete=models.CASCADE,
        related_name="medical_records",
        null=True,
        blank=True,
    )
    group = models.ForeignKey(
        LivestockGroup,
        on_delete=models.CASCADE,
        related_name="medical_records",
        null=True,
        blank=True,
    )
    record_type = models.CharField(max_length=16, choices=RecordType.choices)
    product_or_vaccine = models.CharField(max_length=160)
    administration_date = models.DateField(default=timezone.localdate)
    dosage = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))],
        null=True,
        blank=True,
    )
    dosage_unit = models.CharField(max_length=32, blank=True)
    batch_number = models.CharField(max_length=100, blank=True)
    administered_by = models.CharField(max_length=160, blank=True)
    next_scheduled_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    entry_type = models.CharField(
        max_length=20, choices=EntryType.choices, default=EntryType.FARMER_REPORTED
    )
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="livestock_medical_records",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-administration_date", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(dosage__isnull=True) | Q(dosage__gt=0),
                name="livestock_medical_dosage_positive",
            ),
            models.CheckConstraint(
                condition=(
                    Q(animal__isnull=False, group__isnull=True)
                    | Q(animal__isnull=True, group__isnull=False)
                ),
                name="livestock_medical_exactly_one_subject",
            )
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        if bool(self.animal_id) == bool(self.group_id):
            raise ValidationError("Select exactly one animal or livestock group.")
        if self.administration_date and self.administration_date > timezone.localdate():
            raise ValidationError(
                {"administration_date": "Administration date cannot be in the future."}
            )
        if (
            self.next_scheduled_date
            and self.administration_date
            and self.next_scheduled_date < self.administration_date
        ):
            raise ValidationError(
                {"next_scheduled_date": "Next scheduled date cannot precede administration."}
            )

    def __str__(self):
        return f"{self.get_record_type_display()}: {self.product_or_vaccine}"


class LivestockActivity(models.Model):
    class ActivityType(models.TextChoices):
        FEEDING = "feeding", "Feeding"
        BREEDING = "breeding", "Breeding"
        MILKING = "milking", "Milking"
        VACCINATION = "vaccination", "Vaccination"
        DEWORMING = "deworming", "Deworming"
        VETERINARY_CHECKUP = "veterinary_checkup", "Veterinary checkup"
        SANITATION = "sanitation", "Sanitation"
        EGG_PRODUCTION = "egg_production", "Egg production"
        OTHER = "other", "Other"

    animal = models.ForeignKey(
        Animal, on_delete=models.CASCADE, related_name="activities", null=True, blank=True
    )
    group = models.ForeignKey(
        LivestockGroup,
        on_delete=models.CASCADE,
        related_name="activities",
        null=True,
        blank=True,
    )
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
        related_name="livestock_activities",
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
                name="livestock_activity_quantity_positive",
            ),
            models.CheckConstraint(
                condition=(
                    Q(animal__isnull=False, group__isnull=True)
                    | Q(animal__isnull=True, group__isnull=False)
                ),
                name="livestock_activity_exactly_one_subject",
            )
        ]

    def clean(self):
        from django.core.exceptions import ValidationError

        if bool(self.animal_id) == bool(self.group_id):
            raise ValidationError("Select exactly one animal or livestock group.")

    def __str__(self):
        return f"{self.get_activity_type_display()} ({self.activity_date})"
