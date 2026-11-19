from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


class CommodityCategory(models.Model):
    class Kind(models.TextChoices):
        CROP = "crop", "Crop"
        LIVESTOCK = "livestock", "Livestock and animal products"

    kind = models.CharField(max_length=12, choices=Kind.choices)
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=110)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "name"]
        constraints = [
            models.UniqueConstraint(fields=["kind", "slug"], name="market_category_kind_slug_uniq")
        ]

    def __str__(self):
        return self.name


class TradingUnit(models.Model):
    class MeasureKind(models.TextChoices):
        MASS = "mass", "Mass"
        VOLUME = "volume", "Volume"
        COUNT = "count", "Count"
        CONTAINER = "container", "Container"
        OTHER = "other", "Other"

    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True)
    abbreviation = models.CharField(max_length=24)
    measure_kind = models.CharField(max_length=12, choices=MeasureKind.choices)
    base_unit = models.CharField(max_length=24, blank=True)
    quantity_in_base = models.DecimalField(
        max_digits=14, decimal_places=4, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.0001"))],
    )
    description = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.abbreviation})"


class AgriculturalCommodity(models.Model):
    class Kind(models.TextChoices):
        CROP = "crop", "Crop"
        LIVESTOCK = "livestock", "Livestock and animal product"

    class PriceBasis(models.TextChoices):
        PER_ANIMAL = "per_animal", "Per live animal"
        LIVE_WEIGHT = "live_weight", "Per kilogram live weight"
        CARCASS_WEIGHT = "carcass_weight", "Per kilogram carcass weight"
        MEAT_WEIGHT = "meat_weight", "Per kilogram meat"
        MILK_VOLUME = "milk_volume", "Per litre of milk"
        EGG_COUNT = "egg_count", "Per egg"
        HONEY_WEIGHT = "honey_weight", "Per kilogram of honey"
        OTHER = "other", "Other stated basis"

    kind = models.CharField(max_length=12, choices=Kind.choices)
    category = models.ForeignKey(
        CommodityCategory, on_delete=models.PROTECT, related_name="commodities"
    )
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=160)
    alternative_names = models.JSONField(default=list, blank=True)
    description = models.TextField(blank=True)
    scientific_name = models.CharField(max_length=160, blank=True)
    price_basis = models.CharField(
        max_length=20, choices=PriceBasis.choices, blank=True
    )
    supported_units = models.ManyToManyField(
        TradingUnit, related_name="commodities", blank=True
    )
    image_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    market_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["kind", "slug"], name="market_commodity_kind_slug_uniq"),
            models.UniqueConstraint(
                fields=["kind", "name"], name="market_commodity_kind_name_uniq"
            ),
        ]

    def clean(self):
        errors = {}
        if not isinstance(self.alternative_names, list) or len(self.alternative_names) > 20:
            errors["alternative_names"] = "Provide up to 20 alternative names."
        elif any(
            not isinstance(name, str) or not name.strip() or len(name) > 120
            for name in self.alternative_names
        ):
            errors["alternative_names"] = "Alternative names must be non-empty strings of 120 characters or fewer."
        if self.category_id and self.category.kind != self.kind:
            errors["category"] = "The category must match the commodity type."
        if self.kind == self.Kind.LIVESTOCK and not self.price_basis:
            errors["price_basis"] = "Select the livestock product's price basis."
        if self.kind == self.Kind.CROP and self.price_basis:
            errors["price_basis"] = "Crop commodities do not use livestock price bases."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return self.name


class County(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=3, unique=True)
    slug = models.SlugField(max_length=110, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "counties"

    def __str__(self):
        return self.name


class Market(models.Model):
    class MarketType(models.TextChoices):
        WHOLESALE = "wholesale", "Wholesale"
        RETAIL = "retail", "Retail"
        LIVESTOCK = "livestock", "Livestock"
        FARM_GATE = "farm_gate", "Farm gate"
        COLLECTION = "collection", "Collection point"
        OTHER = "other", "Other"

    name = models.CharField(max_length=150)
    county = models.ForeignKey(County, on_delete=models.PROTECT, related_name="markets")
    sub_county = models.CharField(max_length=100, blank=True)
    location = models.CharField(max_length=255, blank=True)
    market_type = models.CharField(max_length=16, choices=MarketType.choices, default=MarketType.OTHER)
    latitude = models.DecimalField(
        max_digits=8, decimal_places=5, null=True, blank=True,
        validators=[MinValueValidator(Decimal("-90")), MaxValueValidator(Decimal("90"))],
    )
    longitude = models.DecimalField(
        max_digits=8, decimal_places=5, null=True, blank=True,
        validators=[MinValueValidator(Decimal("-180")), MaxValueValidator(Decimal("180"))],
    )
    operating_days = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["county__name", "name"]
        constraints = [
            models.UniqueConstraint(
                fields=["county", "name", "sub_county"], name="market_county_name_subcounty_uniq"
            ),
            models.CheckConstraint(
                condition=(
                    Q(latitude__isnull=True, longitude__isnull=True)
                    | Q(latitude__isnull=False, longitude__isnull=False)
                ),
                name="market_coordinates_both_or_none",
            ),
        ]

    def __str__(self):
        return f"{self.name}, {self.county.name}"


class PriceSource(models.Model):
    class SourceType(models.TextChoices):
        OFFICIAL = "official", "Official public source"
        ORGANIZATION = "organization", "Agricultural organization"
        COMMUNITY = "community", "Community submission"
        MANUAL = "manual", "Authorized manual entry"
        OTHER = "other", "Other"

    class IntegrationStatus(models.TextChoices):
        NOT_ASSESSED = "not_assessed", "Not assessed"
        INVESTIGATED = "investigated", "Investigated"
        AWAITING_AUTHORIZATION = "awaiting_authorization", "Awaiting authorization"
        MANUAL_IMPORT_ONLY = "manual_import_only", "Manual import only"
        INTEGRATED = "integrated", "Integrated"

    name = models.CharField(max_length=150, unique=True)
    slug = models.SlugField(max_length=160, unique=True)
    source_type = models.CharField(max_length=16, choices=SourceType.choices)
    url = models.URLField(blank=True)
    attribution = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    data_type = models.CharField(max_length=120, blank=True)
    coverage = models.CharField(max_length=255, blank=True)
    access_method = models.CharField(max_length=120, blank=True)
    update_frequency = models.CharField(max_length=120, blank=True)
    usage_terms = models.TextField(blank=True)
    data_use_authorized = models.BooleanField(default=False)
    integration_status = models.CharField(
        max_length=24,
        choices=IntegrationStatus.choices,
        default=IntegrationStatus.NOT_ASSESSED,
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def clean(self):
        if self.source_type in {self.SourceType.OFFICIAL, self.SourceType.ORGANIZATION} and not self.url:
            raise ValidationError({"url": "Provide the source's official URL for attribution."})

    def __str__(self):
        return self.name


class PriceImportBatch(models.Model):
    class Status(models.TextChoices):
        PREVIEWED = "previewed", "Previewed"
        IMPORTED = "imported", "Imported"
        PARTIAL = "partial", "Completed with skipped rows"
        ROLLED_BACK = "rolled_back", "Rolled back"
        FAILED = "failed", "Failed"

    source = models.ForeignKey(
        PriceSource, on_delete=models.PROTECT, related_name="import_batches"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="market_price_import_batches",
    )
    file_name = models.CharField(max_length=255)
    file_sha256 = models.CharField(max_length=64, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices)
    total_rows = models.PositiveIntegerField(default=0)
    valid_rows = models.PositiveIntegerField(default=0)
    invalid_rows = models.PositiveIntegerField(default=0)
    duplicate_rows = models.PositiveIntegerField(default=0)
    imported_rows = models.PositiveIntegerField(default=0)
    pending_rows = models.PositiveIntegerField(default=0)
    rolled_back_rows = models.PositiveIntegerField(default=0)
    row_errors = models.JSONField(default=list, blank=True)
    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)
    rolled_back_at = models.DateTimeField(null=True, blank=True)
    rolled_back_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="market_price_import_batches_rolled_back",
        null=True,
        blank=True,
    )
    rollback_reason = models.CharField(max_length=500, blank=True)

    class Meta:
        ordering = ["-started_at", "-id"]
        indexes = [models.Index(fields=["status", "started_at"])]

    def __str__(self):
        return f"{self.file_name} ({self.get_status_display()})"


class FarmerMarketWatch(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="market_watchlist_items",
    )
    commodity = models.ForeignKey(
        AgriculturalCommodity,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="farmer_watchlist_items",
    )
    county = models.ForeignKey(
        County,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="farmer_watchlist_items",
    )
    market = models.ForeignKey(
        Market,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="farmer_watchlist_items",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(commodity__isnull=False, county__isnull=True, market__isnull=True)
                    | Q(commodity__isnull=True, county__isnull=False, market__isnull=True)
                    | Q(commodity__isnull=True, county__isnull=True, market__isnull=False)
                ),
                name="market_watch_exactly_one_target",
            ),
            models.UniqueConstraint(
                fields=["user", "commodity"],
                condition=Q(commodity__isnull=False),
                name="market_watch_user_commodity_uniq",
            ),
            models.UniqueConstraint(
                fields=["user", "county"],
                condition=Q(county__isnull=False),
                name="market_watch_user_county_uniq",
            ),
            models.UniqueConstraint(
                fields=["user", "market"],
                condition=Q(market__isnull=False),
                name="market_watch_user_market_uniq",
            ),
        ]


class MarketPriceObservation(models.Model):
    class PriceType(models.TextChoices):
        WHOLESALE = "wholesale", "Wholesale"
        RETAIL = "retail", "Retail"
        FARM_GATE = "farm_gate", "Farm gate"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending verification"
        VERIFIED = "verified", "Verified"
        ESTIMATED = "estimated", "Estimated"
        REJECTED = "rejected", "Rejected"

    currency = models.CharField(max_length=3, default="KES", editable=False)
    commodity = models.ForeignKey(
        AgriculturalCommodity, on_delete=models.PROTECT, related_name="price_observations"
    )
    market = models.ForeignKey(Market, on_delete=models.PROTECT, related_name="price_observations")
    county = models.ForeignKey(County, on_delete=models.PROTECT, related_name="price_observations")
    source = models.ForeignKey(PriceSource, on_delete=models.PROTECT, related_name="price_observations")
    import_batch = models.ForeignKey(
        PriceImportBatch,
        on_delete=models.PROTECT,
        related_name="observations",
        null=True,
        blank=True,
    )
    source_reference = models.CharField(max_length=255, blank=True)
    price_type = models.CharField(max_length=12, choices=PriceType.choices)
    unit = models.ForeignKey(TradingUnit, on_delete=models.PROTECT, related_name="price_observations")
    unit_quantity = models.DecimalField(
        max_digits=14, decimal_places=4, validators=[MinValueValidator(Decimal("0.0001"))]
    )
    minimum_price = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    maximum_price = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    average_price = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    variety_grade = models.CharField(max_length=120, blank=True)
    livestock_price_basis = models.CharField(
        max_length=20, choices=AgriculturalCommodity.PriceBasis.choices, blank=True
    )
    livestock_breed = models.CharField(max_length=120, blank=True)
    animal_age_category = models.CharField(max_length=80, blank=True)
    animal_sex = models.CharField(max_length=12, blank=True)
    body_condition = models.CharField(max_length=80, blank=True)
    animal_weight_kg = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    observation_date = models.DateField()
    published_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="market_price_observations_submitted",
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="market_price_observations_verified",
    )
    verification_note = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-observation_date", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(minimum_price__isnull=True) | Q(maximum_price__isnull=True) | Q(minimum_price__lte=models.F("maximum_price")),
                name="market_price_min_lte_max",
            ),
            models.CheckConstraint(
                condition=Q(minimum_price__isnull=False) | Q(maximum_price__isnull=False) | Q(average_price__isnull=False),
                name="market_price_has_value",
            ),
            models.UniqueConstraint(
                fields=[
                    "commodity", "market", "source", "price_type", "unit", "unit_quantity",
                    "observation_date", "variety_grade",
                ],
                condition=~Q(status="rejected"),
                name="market_price_observation_uniq",
            ),
        ]
        indexes = [
            models.Index(fields=["commodity", "market", "observation_date"]),
            models.Index(fields=["status", "observation_date"]),
            models.Index(fields=["county", "observation_date"]),
        ]

    def clean(self):
        errors = {}
        if (
            self._state.adding
            and self.source_id
            and self.source.source_type in {
                PriceSource.SourceType.OFFICIAL,
                PriceSource.SourceType.ORGANIZATION,
            }
            and not self.source.data_use_authorized
        ):
            errors["source"] = "Confirm data-use authorization before importing from this source."
        if self.market_id and self.county_id and self.market.county_id != self.county_id:
            errors["county"] = "The selected county must match the market's county."
        if self.commodity_id and self.commodity.kind == AgriculturalCommodity.Kind.CROP:
            if self.livestock_price_basis:
                errors["livestock_price_basis"] = "Crop prices cannot use a livestock price basis."
            if any(
                (
                    self.animal_weight_kg is not None,
                    bool(self.livestock_breed),
                    bool(self.animal_age_category),
                    bool(self.animal_sex),
                    bool(self.body_condition),
                )
            ):
                errors["livestock_breed"] = "Livestock details are only valid for livestock prices."
        if self.commodity_id and self.commodity.kind == AgriculturalCommodity.Kind.LIVESTOCK:
            if not self.livestock_price_basis:
                errors["livestock_price_basis"] = "A livestock price basis is required."
            elif self.livestock_price_basis != self.commodity.price_basis:
                errors["livestock_price_basis"] = "The price basis must match the livestock commodity."
            if self.variety_grade:
                errors["variety_grade"] = "Crop variety or grade is not valid for livestock prices."
        if self.commodity_id and self.unit_id:
            supported_units = self.commodity.supported_units.filter(is_active=True)
            if not supported_units.exists():
                errors["unit"] = "Configure at least one supported trading unit for this commodity."
            elif not supported_units.filter(pk=self.unit_id).exists():
                errors["unit"] = "The selected trading unit is not supported by this commodity."
        if self.minimum_price is not None and self.maximum_price is not None:
            if self.minimum_price > self.maximum_price:
                errors["maximum_price"] = "Maximum price must be greater than or equal to minimum price."
        if self.average_price is not None and self.minimum_price is not None:
            if self.average_price < self.minimum_price:
                errors["average_price"] = "Average price cannot be below the minimum price."
        if self.average_price is not None and self.maximum_price is not None:
            if self.average_price > self.maximum_price:
                errors["average_price"] = "Average price cannot exceed the maximum price."
        if all(value is None for value in (self.minimum_price, self.maximum_price, self.average_price)):
            errors["average_price"] = "Provide at least one price value."
        if self.observation_date and self.observation_date > timezone.localdate():
            errors["observation_date"] = "Observation date cannot be in the future."
        if self.status == self.Status.VERIFIED and not self.verified_by_id:
            errors["verified_by"] = "Verified prices must record the reviewer."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.status in {self.Status.VERIFIED, self.Status.ESTIMATED} and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    @property
    def freshness(self):
        age_days = (timezone.localdate() - self.observation_date).days
        if age_days <= getattr(settings, "MARKET_PRICE_FRESH_DAYS", 7):
            return "fresh"
        if age_days <= getattr(settings, "MARKET_PRICE_RECENT_DAYS", 30):
            return "recent"
        if age_days <= getattr(settings, "MARKET_PRICE_AGING_DAYS", 90):
            return "aging"
        return "stale"

    @property
    def age_days(self):
        return (timezone.localdate() - self.observation_date).days

    def __str__(self):
        return f"{self.commodity.name} at {self.market} ({self.observation_date})"


class PriceSubmission(models.Model):
    class ReviewStatus(models.TextChoices):
        PENDING = "pending", "Pending verification"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    commodity = models.ForeignKey(
        AgriculturalCommodity, on_delete=models.PROTECT, related_name="submissions"
    )
    market = models.ForeignKey(Market, on_delete=models.PROTECT, related_name="price_submissions")
    county = models.ForeignKey(County, on_delete=models.PROTECT, related_name="price_submissions")
    source = models.ForeignKey(PriceSource, on_delete=models.PROTECT, related_name="submissions")
    price_type = models.CharField(max_length=12, choices=MarketPriceObservation.PriceType.choices)
    unit = models.ForeignKey(TradingUnit, on_delete=models.PROTECT, related_name="price_submissions")
    unit_quantity = models.DecimalField(
        max_digits=14, decimal_places=4, validators=[MinValueValidator(Decimal("0.0001"))]
    )
    minimum_price = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    maximum_price = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    average_price = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    variety_grade = models.CharField(max_length=120, blank=True)
    livestock_price_basis = models.CharField(
        max_length=20, choices=AgriculturalCommodity.PriceBasis.choices, blank=True
    )
    livestock_breed = models.CharField(max_length=120, blank=True)
    animal_age_category = models.CharField(max_length=80, blank=True)
    animal_sex = models.CharField(max_length=12, blank=True)
    body_condition = models.CharField(max_length=80, blank=True)
    animal_weight_kg = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    observation_date = models.DateField()
    submitter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="market_price_submissions"
    )
    status = models.CharField(
        max_length=12, choices=ReviewStatus.choices, default=ReviewStatus.PENDING
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="market_price_submissions_reviewed",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=Q(minimum_price__isnull=True) | Q(maximum_price__isnull=True) | Q(minimum_price__lte=models.F("maximum_price")),
                name="market_submission_min_lte_max",
            ),
            models.CheckConstraint(
                condition=Q(minimum_price__isnull=False) | Q(maximum_price__isnull=False) | Q(average_price__isnull=False),
                name="market_submission_has_value",
            ),
        ]
        indexes = [
            models.Index(fields=["submitter", "status", "created_at"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def clean(self):
        errors = {}
        if self.market_id and self.county_id and self.market.county_id != self.county_id:
            errors["county"] = "The selected county must match the market's county."
        if self.commodity_id and self.commodity.kind == AgriculturalCommodity.Kind.CROP:
            if self.livestock_price_basis or self.animal_weight_kg is not None:
                errors["livestock_price_basis"] = "Crop prices cannot include livestock details."
            if self.livestock_breed or self.animal_age_category or self.animal_sex or self.body_condition:
                errors["livestock_breed"] = "Livestock details are only valid for livestock prices."
        if self.commodity_id and self.commodity.kind == AgriculturalCommodity.Kind.LIVESTOCK:
            if self.livestock_price_basis != self.commodity.price_basis:
                errors["livestock_price_basis"] = "The price basis must match the livestock commodity."
            if self.variety_grade:
                errors["variety_grade"] = "Crop variety or grade is not valid for livestock prices."
        if self.commodity_id and self.unit_id:
            supported_units = self.commodity.supported_units.filter(is_active=True)
            if not supported_units.exists():
                errors["unit"] = "Configure at least one supported trading unit for this commodity."
            elif not supported_units.filter(pk=self.unit_id).exists():
                errors["unit"] = "The selected trading unit is not supported by this commodity."
        if self.minimum_price is not None and self.maximum_price is not None:
            if self.minimum_price > self.maximum_price:
                errors["maximum_price"] = "Maximum price must be greater than or equal to minimum price."
        if self.average_price is not None and self.minimum_price is not None:
            if self.average_price < self.minimum_price:
                errors["average_price"] = "Average price cannot be below the minimum price."
        if self.average_price is not None and self.maximum_price is not None:
            if self.average_price > self.maximum_price:
                errors["average_price"] = "Average price cannot exceed the maximum price."
        if all(value is None for value in (self.minimum_price, self.maximum_price, self.average_price)):
            errors["average_price"] = "Provide at least one price value."
        if self.observation_date and self.observation_date > timezone.localdate():
            errors["observation_date"] = "Observation date cannot be in the future."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.commodity.name} price submission ({self.status})"


class MarketPriceAuditEventQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValidationError("Market-price audit events are append-only.")

    def delete(self):
        raise ValidationError("Market-price audit events are append-only.")


class MarketPriceAuditEvent(models.Model):
    class Action(models.TextChoices):
        SUBMITTED = "submitted", "Submitted"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        EDITED = "edited", "Edited"
        OBSERVATION_CREATED = "observation_created", "Observation created"
        OBSERVATION_EDITED = "observation_edited", "Observation edited"
        OBSERVATION_VERIFIED = "observation_verified", "Observation verified"
        OBSERVATION_STATUS_CHANGED = "observation_status_changed", "Observation status changed"
        SUGGESTION_APPROVED = "suggestion_approved", "Commodity suggestion approved"
        SUGGESTION_REJECTED = "suggestion_rejected", "Commodity suggestion rejected"

    submission = models.ForeignKey(
        PriceSubmission, on_delete=models.PROTECT, related_name="audit_events",
        null=True, blank=True,
    )
    observation = models.ForeignKey(
        MarketPriceObservation, on_delete=models.PROTECT, related_name="audit_events",
        null=True, blank=True,
    )
    suggestion = models.ForeignKey(
        "CommoditySuggestion", on_delete=models.PROTECT, related_name="audit_events",
        null=True, blank=True,
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="market_price_audit_events"
    )
    action = models.CharField(max_length=32, choices=Action.choices)
    previous_status = models.CharField(max_length=12, blank=True)
    new_status = models.CharField(max_length=12)
    notes = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    Q(submission__isnull=False, observation__isnull=True, suggestion__isnull=True)
                    | Q(submission__isnull=True, observation__isnull=False, suggestion__isnull=True)
                    | Q(submission__isnull=True, observation__isnull=True, suggestion__isnull=False)
                ),
                name="market_audit_exactly_one_target",
            ),
        ]

    objects = MarketPriceAuditEventQuerySet.as_manager()

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValidationError("Market-price audit events are append-only.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Market-price audit events are append-only.")

    def __str__(self):
        if self.submission_id:
            target = f"price submission #{self.submission_id}"
        elif self.observation_id:
            target = f"price observation #{self.observation_id}"
        else:
            target = f"commodity suggestion #{self.suggestion_id}"
        return f"{self.get_action_display()} {target}"


class CommoditySuggestion(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    kind = models.CharField(max_length=12, choices=AgriculturalCommodity.Kind.choices)
    suggested_name = models.CharField(max_length=150)
    alternative_names = models.JSONField(default=list, blank=True)
    price_basis = models.CharField(
        max_length=20, choices=AgriculturalCommodity.PriceBasis.choices, blank=True
    )
    category = models.ForeignKey(
        CommodityCategory, on_delete=models.PROTECT, related_name="suggestions"
    )
    description = models.TextField(blank=True)
    submitter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="commodity_suggestions"
    )
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="commodity_suggestions_reviewed",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_note = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def clean(self):
        errors = {}
        if not isinstance(self.alternative_names, list) or len(self.alternative_names) > 20:
            errors["alternative_names"] = "Provide up to 20 alternative names."
        elif any(
            not isinstance(name, str) or not name.strip() or len(name) > 120
            for name in self.alternative_names
        ):
            errors["alternative_names"] = "Alternative names must be non-empty strings of 120 characters or fewer."
        if self.category_id and self.category.kind != self.kind:
            errors["category"] = "The category must match the suggested commodity type."
        if self.kind == AgriculturalCommodity.Kind.LIVESTOCK and not self.price_basis:
            errors["price_basis"] = "Select the livestock product's price basis."
        if self.kind == AgriculturalCommodity.Kind.CROP and self.price_basis:
            errors["price_basis"] = "Crop suggestions do not use livestock price bases."
        if errors:
            raise ValidationError(errors)

    def __str__(self):
        return f"{self.suggested_name} ({self.status})"
