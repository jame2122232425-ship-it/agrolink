from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.market_intelligence.models import (
    AgriculturalCommodity,
    CommodityCategory,
    CommoditySuggestion,
    County,
    FarmerMarketWatch,
    Market,
    PriceImportBatch,
    MarketPriceAuditEvent,
    MarketPriceObservation,
    PriceSource,
    PriceSubmission,
    TradingUnit,
)


class CommodityCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CommodityCategory
        fields = ("id", "kind", "name", "slug", "description")
        read_only_fields = fields


class TradingUnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradingUnit
        fields = (
            "id", "name", "slug", "abbreviation", "measure_kind", "base_unit",
            "quantity_in_base", "description",
        )
        read_only_fields = fields


class AgriculturalCommoditySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    supported_units = TradingUnitSerializer(many=True, read_only=True)

    class Meta:
        model = AgriculturalCommodity
        fields = (
            "id", "kind", "category", "category_name", "name", "slug",
            "alternative_names", "description", "scientific_name", "price_basis",
            "supported_units", "image_url", "created_at", "updated_at",
        )
        read_only_fields = fields


class CountySerializer(serializers.ModelSerializer):
    class Meta:
        model = County
        fields = ("id", "name", "code", "slug")
        read_only_fields = fields


class MarketSerializer(serializers.ModelSerializer):
    county_name = serializers.CharField(source="county.name", read_only=True)

    class Meta:
        model = Market
        fields = (
            "id", "name", "county", "county_name", "sub_county", "location",
            "market_type", "latitude", "longitude", "operating_days",
        )
        read_only_fields = fields


class PriceSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceSource
        fields = (
            "id", "name", "source_type", "url", "attribution", "data_type",
            "coverage", "access_method", "update_frequency", "usage_terms",
            "data_use_authorized", "integration_status",
        )
        read_only_fields = fields


class PriceImportBatchSerializer(serializers.ModelSerializer):
    source_name = serializers.CharField(source="source.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)

    class Meta:
        model = PriceImportBatch
        fields = (
            "id", "source", "source_name", "created_by_name", "file_name", "file_sha256",
            "status", "total_rows", "valid_rows", "invalid_rows", "duplicate_rows",
            "imported_rows", "pending_rows", "rolled_back_rows", "row_errors", "started_at",
            "completed_at", "rolled_back_at", "rolled_back_by", "rollback_reason",
        )
        read_only_fields = fields


class PriceImportRollbackSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=500, trim_whitespace=True)

    def validate_reason(self, value):
        if not value.strip():
            raise serializers.ValidationError("Provide a reason for rolling back this import batch.")
        return value


class MarketPriceObservationSerializer(serializers.ModelSerializer):
    commodity_name = serializers.CharField(source="commodity.name", read_only=True)
    commodity_kind = serializers.CharField(source="commodity.kind", read_only=True)
    commodity_category = serializers.CharField(source="commodity.category.name", read_only=True)
    market_name = serializers.CharField(source="market.name", read_only=True)
    county_name = serializers.CharField(source="county.name", read_only=True)
    unit_name = serializers.CharField(source="unit.name", read_only=True)
    unit_abbreviation = serializers.CharField(source="unit.abbreviation", read_only=True)
    source_name = serializers.CharField(source="source.name", read_only=True)
    source_url = serializers.URLField(source="source.url", read_only=True)
    age_days = serializers.IntegerField(read_only=True)
    freshness = serializers.CharField(read_only=True)

    class Meta:
        model = MarketPriceObservation
        fields = (
            "id", "currency", "commodity", "commodity_name", "commodity_kind", "commodity_category",
            "market", "market_name", "county", "county_name", "source", "source_name",
            "source_url", "source_reference", "price_type", "unit", "unit_name", "unit_abbreviation",
            "unit_quantity", "minimum_price", "maximum_price", "average_price",
            "variety_grade", "livestock_price_basis", "animal_age_category",
            "livestock_breed", "animal_sex", "body_condition", "animal_weight_kg", "observation_date",
            "published_at", "status", "age_days", "freshness",
        )
        read_only_fields = fields


class PriceSubmissionSerializer(serializers.ModelSerializer):
    commodity_name = serializers.CharField(source="commodity.name", read_only=True)
    market_name = serializers.CharField(source="market.name", read_only=True)
    county_name = serializers.CharField(source="county.name", read_only=True)
    unit_name = serializers.CharField(source="unit.name", read_only=True)
    source_name = serializers.CharField(source="source.name", read_only=True)
    submitter_id = serializers.IntegerField(source="submitter.pk", read_only=True)
    submitter_name = serializers.CharField(source="submitter.get_full_name", read_only=True)
    reviewed_by_id = serializers.IntegerField(source="reviewed_by.pk", read_only=True)

    class Meta:
        model = PriceSubmission
        fields = (
            "id", "commodity", "commodity_name", "market", "market_name", "county_name",
            "price_type", "unit", "unit_name", "unit_quantity", "minimum_price",
            "maximum_price", "average_price", "variety_grade", "livestock_price_basis",
            "livestock_breed", "animal_age_category", "animal_sex", "body_condition", "animal_weight_kg",
            "observation_date", "source_name", "status", "review_note",
            "submitter_id", "submitter_name", "reviewed_by_id", "reviewed_at", "created_at",
        )
        read_only_fields = (
            "id", "county_name", "source_name", "status", "review_note",
            "submitter_id", "submitter_name", "reviewed_by_id", "reviewed_at", "created_at",
        )

    def validate(self, attrs):
        commodity = attrs["commodity"]
        market = attrs["market"]
        unit = attrs["unit"]
        if (
            not commodity.is_active
            or not commodity.market_available
            or not commodity.category.is_active
        ):
            raise serializers.ValidationError({"commodity": "This commodity is not accepting price submissions."})
        if not market.is_active or not market.county.is_active:
            raise serializers.ValidationError({"market": "This market is not currently active."})
        if not unit.is_active:
            raise serializers.ValidationError({"unit": "This trading unit is not currently active."})
        supported_units = commodity.supported_units.filter(is_active=True)
        if not supported_units.exists():
            raise serializers.ValidationError(
                {"unit": "This commodity has no configured trading units yet."}
            )
        if not supported_units.filter(pk=unit.pk).exists():
            raise serializers.ValidationError({"unit": "Select a supported unit for this commodity."})

        source = PriceSource.objects.filter(
            slug="community-submission", is_active=True
        ).first()
        if source is None:
            raise serializers.ValidationError(
                {"detail": "Community price submissions are not configured. Contact an administrator."}
            )
        submission = PriceSubmission(
            **attrs,
            county=market.county,
            source=source,
            submitter=self.context["request"].user,
        )
        try:
            submission.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc

        duplicate = PriceSubmission.objects.filter(
            submitter=self.context["request"].user,
            commodity=commodity,
            market=market,
            observation_date=attrs["observation_date"],
            unit=unit,
            unit_quantity=attrs["unit_quantity"],
            price_type=attrs["price_type"],
            variety_grade=attrs.get("variety_grade", ""),
            status=PriceSubmission.ReviewStatus.PENDING,
        ).exists()
        if duplicate:
            raise serializers.ValidationError(
                {"observation_date": "You already have a pending submission for this commodity, market, and date."}
            )
        published_duplicate = MarketPriceObservation.objects.filter(
            commodity=commodity,
            market=market,
            observation_date=attrs["observation_date"],
            unit=unit,
            unit_quantity=attrs["unit_quantity"],
            price_type=attrs["price_type"],
            source=source,
            variety_grade=attrs.get("variety_grade", ""),
            status__in=[
                MarketPriceObservation.Status.VERIFIED,
                MarketPriceObservation.Status.ESTIMATED,
            ],
        ).exists()
        if published_duplicate:
            raise serializers.ValidationError(
                {"observation_date": "A published price from this source already exists for this date."}
            )
        attrs["county"] = market.county
        attrs["source"] = source
        attrs["submitter"] = self.context["request"].user
        return attrs

    def create(self, validated_data):
        return PriceSubmission.objects.create(**validated_data)


class CommoditySuggestionSerializer(serializers.ModelSerializer):
    submitter_id = serializers.IntegerField(source="submitter.pk", read_only=True)
    submitter_name = serializers.CharField(source="submitter.get_full_name", read_only=True)

    class Meta:
        model = CommoditySuggestion
        fields = (
            "id", "kind", "suggested_name", "alternative_names", "price_basis", "category",
            "description", "status", "review_note", "submitter_id", "submitter_name", "created_at",
        )
        read_only_fields = ("id", "status", "review_note", "created_at")

    def validate(self, attrs):
        category = attrs["category"]
        if not category.is_active:
            raise serializers.ValidationError({"category": "This category is not active."})
        if category.kind != attrs["kind"]:
            raise serializers.ValidationError({"category": "The category must match the commodity type."})
        if attrs["kind"] == AgriculturalCommodity.Kind.LIVESTOCK and not attrs.get("price_basis"):
            raise serializers.ValidationError({"price_basis": "A livestock price basis is required."})
        if attrs["kind"] == AgriculturalCommodity.Kind.CROP and attrs.get("price_basis"):
            raise serializers.ValidationError({"price_basis": "Crop suggestions do not use livestock price bases."})
        aliases = attrs.get("alternative_names", [])
        if not isinstance(aliases, list) or len(aliases) > 20 or any(
            not isinstance(alias, str) or not alias.strip() or len(alias) > 120
            for alias in aliases
        ):
            raise serializers.ValidationError(
                {"alternative_names": "Provide up to 20 non-empty alternative names of 120 characters or fewer."}
            )
        duplicate = CommoditySuggestion.objects.filter(
            submitter=self.context["request"].user,
            kind=attrs["kind"],
            suggested_name__iexact=attrs["suggested_name"],
            status=CommoditySuggestion.Status.PENDING,
        ).exists()
        if duplicate:
            raise serializers.ValidationError(
                {"suggested_name": "You already have a pending suggestion with this name."}
            )
        return attrs

    def create(self, validated_data):
        return CommoditySuggestion.objects.create(
            **validated_data, submitter=self.context["request"].user
        )


class FarmerMarketWatchSerializer(serializers.ModelSerializer):
    commodity_name = serializers.CharField(source="commodity.name", read_only=True, allow_null=True)
    county_name = serializers.CharField(source="county.name", read_only=True, allow_null=True)
    market_name = serializers.CharField(source="market.name", read_only=True, allow_null=True)

    class Meta:
        model = FarmerMarketWatch
        fields = (
            "id", "commodity", "commodity_name", "county", "county_name",
            "market", "market_name", "created_at",
        )
        read_only_fields = ("id", "commodity_name", "county_name", "market_name", "created_at")

    def validate(self, attrs):
        targets = [attrs.get("commodity"), attrs.get("county"), attrs.get("market")]
        if sum(target is not None for target in targets) != 1:
            raise serializers.ValidationError(
                "Choose exactly one commodity, county, or market to add to your watchlist."
            )
        commodity = attrs.get("commodity")
        county = attrs.get("county")
        market = attrs.get("market")
        if commodity and (
            not commodity.is_active
            or not commodity.market_available
            or not commodity.category.is_active
        ):
            raise serializers.ValidationError({"commodity": "Choose an active market commodity."})
        if county and not county.is_active:
            raise serializers.ValidationError({"county": "Choose an active county."})
        if market and (not market.is_active or not market.county.is_active):
            raise serializers.ValidationError({"market": "Choose an active market."})
        duplicate_query = FarmerMarketWatch.objects.filter(user=self.context["request"].user)
        if commodity:
            duplicate_query = duplicate_query.filter(commodity=commodity)
        elif county:
            duplicate_query = duplicate_query.filter(county=county)
        else:
            duplicate_query = duplicate_query.filter(market=market)
        if duplicate_query.exists():
            raise serializers.ValidationError("This item is already on your watchlist.")
        return attrs


class MarketComparisonSerializer(serializers.Serializer):
    commodity = serializers.PrimaryKeyRelatedField(
        queryset=AgriculturalCommodity.objects.filter(
            is_active=True, market_available=True, category__is_active=True
        )
    )
    county = serializers.PrimaryKeyRelatedField(
        queryset=County.objects.filter(is_active=True), required=False
    )
    markets = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(
            queryset=Market.objects.filter(is_active=True, county__is_active=True)
        ),
        min_length=2,
        max_length=10,
    )
    price_type = serializers.ChoiceField(choices=MarketPriceObservation.PriceType.choices)
    observed_after = serializers.DateField(required=False)
    observed_before = serializers.DateField(required=False)
    unit = serializers.PrimaryKeyRelatedField(
        queryset=TradingUnit.objects.filter(is_active=True), required=False
    )
    variety_grade = serializers.CharField(max_length=120, required=False, allow_blank=True)

    def validate(self, attrs):
        market_ids = [market.pk for market in attrs["markets"]]
        if len(set(market_ids)) != len(market_ids):
            raise serializers.ValidationError({"markets": "Select each market only once."})
        county = attrs.get("county")
        if county and any(market.county_id != county.pk for market in attrs["markets"]):
            raise serializers.ValidationError(
                {"markets": "All selected markets must be in the selected county."}
            )
        after = attrs.get("observed_after")
        before = attrs.get("observed_before")
        if after and before and after > before:
            raise serializers.ValidationError({"observed_before": "End date must not precede start date."})
        return attrs


class LivestockValuationSerializer(serializers.Serializer):
    commodity = serializers.PrimaryKeyRelatedField(
        queryset=AgriculturalCommodity.objects.filter(
            kind=AgriculturalCommodity.Kind.LIVESTOCK,
            is_active=True,
            market_available=True,
            category__is_active=True,
        )
    )
    market = serializers.PrimaryKeyRelatedField(
        queryset=Market.objects.filter(is_active=True, county__is_active=True)
    )
    price_type = serializers.ChoiceField(choices=MarketPriceObservation.PriceType.choices)
    weight_kg = serializers.DecimalField(
        max_digits=10, decimal_places=2, min_value=Decimal("0.01"), required=False
    )
    animal_count = serializers.IntegerField(min_value=1, max_value=100, default=1)
    breed = serializers.CharField(max_length=120, required=False, allow_blank=True)
    age_category = serializers.CharField(max_length=80, required=False, allow_blank=True)

    def validate(self, attrs):
        commodity = attrs["commodity"]
        if commodity.price_basis == AgriculturalCommodity.PriceBasis.LIVE_WEIGHT:
            if attrs.get("weight_kg") is None:
                raise serializers.ValidationError(
                    {"weight_kg": "Enter the animal's live weight in kilograms."}
                )
        elif attrs.get("weight_kg") is not None:
            raise serializers.ValidationError(
                {"weight_kg": "Weight-based valuation is available only for live-weight commodities."}
            )
        return attrs


class PriceReviewSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(
        choices=[
            (PriceSubmission.ReviewStatus.APPROVED, "Approve"),
            (PriceSubmission.ReviewStatus.REJECTED, "Reject"),
        ]
    )
    note = serializers.CharField(max_length=500, trim_whitespace=True)

    def validate_note(self, value):
        if not value.strip():
            raise serializers.ValidationError("Provide a review note for the audit record.")
        return value


class MarketPriceAuditEventSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.get_full_name", read_only=True)
    commodity_name = serializers.SerializerMethodField()

    class Meta:
        model = MarketPriceAuditEvent
        fields = (
            "id", "submission", "observation", "suggestion", "actor", "actor_name",
            "commodity_name", "action", "previous_status", "new_status", "notes", "created_at",
        )
        read_only_fields = fields

    def get_commodity_name(self, event):
        if event.submission_id:
            return event.submission.commodity.name
        if event.observation_id:
            return event.observation.commodity.name
        if event.suggestion_id:
            return event.suggestion.suggested_name
        return None


class CommoditySuggestionReviewSerializer(serializers.Serializer):
    decision = serializers.ChoiceField(
        choices=[
            (CommoditySuggestion.Status.APPROVED, "Approve"),
            (CommoditySuggestion.Status.REJECTED, "Reject"),
        ]
    )
    note = serializers.CharField(max_length=500, trim_whitespace=True)

    def validate_note(self, value):
        if not value.strip():
            raise serializers.ValidationError("Provide a review note for the audit record.")
        return value
