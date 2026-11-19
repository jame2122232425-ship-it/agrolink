from decimal import Decimal, InvalidOperation
import hashlib
import tempfile
from datetime import timedelta
from pathlib import Path
from pathlib import PurePath
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import transaction
from django.db.models import Avg, Count, F, Max, Min, Q, TextField, Window
from django.db.models.functions import Cast
from django.db.models.functions import RowNumber
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import filters, generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny
from rest_framework.generics import DestroyAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.market_intelligence.models import (
    AgriculturalCommodity,
    CommodityCategory,
    CommoditySuggestion,
    County,
    Market,
    MarketPriceAuditEvent,
    MarketPriceObservation,
    PriceImportBatch,
    PriceSource,
    PriceSubmission,
    TradingUnit,
)
from apps.market_intelligence.permissions import (
    CanManageMarketImports,
    CanReviewMarketData,
    IsActiveMarketContributor,
)
from apps.market_intelligence.serializers import (
    AgriculturalCommoditySerializer,
    CommodityCategorySerializer,
    CommoditySuggestionSerializer,
    CommoditySuggestionReviewSerializer,
    CountySerializer,
    MarketPriceAuditEventSerializer,
    MarketPriceObservationSerializer,
    MarketComparisonSerializer,
    LivestockValuationSerializer,
    FarmerMarketWatchSerializer,
    PriceImportBatchSerializer,
    PriceSourceSerializer,
    PriceImportRollbackSerializer,
    MarketSerializer,
    PriceReviewSerializer,
    PriceSubmissionSerializer,
    TradingUnitSerializer,
)
from apps.accounts.models import FarmerProfile
from apps.market_intelligence.models import FarmerMarketWatch
from apps.market_intelligence.services import (
    build_livestock_valuation,
    review_commodity_suggestion,
    review_price_submission,
    rollback_price_import_batch,
)


class MarketPagination(PageNumberPagination):
    page_size = 30
    page_size_query_param = "page_size"
    max_page_size = 100


class CommoditySearchFilter(filters.SearchFilter):
    def filter_queryset(self, request, queryset, view):
        search_terms = self.get_search_terms(request)
        if not search_terms:
            return queryset

        queryset = queryset.annotate(
            alternative_names_text=Cast("alternative_names", output_field=TextField())
        )
        search_fields = self.get_search_fields(request, view) or []
        search_fields = [*search_fields, "alternative_names_text"]
        for term in search_terms:
            term_query = Q()
            for field in search_fields:
                term_query |= Q(**{f"{field}__icontains": term})
            queryset = queryset.filter(term_query)
        return queryset.distinct()


def _positive_id(query_params, name):
    value = query_params.get(name)
    if value is None:
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError({name: "Enter a valid integer ID."}) from exc
    if parsed <= 0:
        raise ValidationError({name: "Enter a valid positive integer ID."})
    return parsed


class CommodityCategoryListView(generics.ListAPIView):
    serializer_class = CommodityCategorySerializer
    pagination_class = None
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["sort_order", "name"]
    ordering = ["sort_order", "name"]

    def get_queryset(self):
        queryset = CommodityCategory.objects.filter(is_active=True)
        kind = self.request.query_params.get("kind")
        if kind:
            if kind not in AgriculturalCommodity.Kind.values:
                raise ValidationError({"kind": "Choose crop or livestock."})
            queryset = queryset.filter(kind=kind)
        return queryset


class CropCategoryListView(CommodityCategoryListView):
    def get_queryset(self):
        return super().get_queryset().filter(kind=AgriculturalCommodity.Kind.CROP)


class LivestockCategoryListView(CommodityCategoryListView):
    def get_queryset(self):
        return super().get_queryset().filter(kind=AgriculturalCommodity.Kind.LIVESTOCK)


class TradingUnitListView(generics.ListAPIView):
    serializer_class = TradingUnitSerializer
    pagination_class = None

    def get_queryset(self):
        return TradingUnit.objects.filter(is_active=True)


class AgriculturalCommodityListView(generics.ListAPIView):
    serializer_class = AgriculturalCommoditySerializer
    pagination_class = MarketPagination
    filter_backends = [CommoditySearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description", "scientific_name"]
    ordering_fields = ["name", "kind", "created_at"]
    ordering = ["kind", "name"]
    fixed_kind = None

    def get_queryset(self):
        queryset = AgriculturalCommodity.objects.filter(
            is_active=True, market_available=True, category__is_active=True
        ).select_related("category").prefetch_related("supported_units")
        requested_kind = self.request.query_params.get("kind")
        if self.fixed_kind and requested_kind not in {None, "", self.fixed_kind}:
            raise ValidationError({"kind": f"This endpoint only supports {self.fixed_kind} commodities."})
        kind = self.fixed_kind or requested_kind
        if kind:
            if kind not in AgriculturalCommodity.Kind.values:
                raise ValidationError({"kind": "Choose crop or livestock."})
            queryset = queryset.filter(kind=kind)
        category_id = _positive_id(self.request.query_params, "category")
        if category_id is not None:
            queryset = queryset.filter(category_id=category_id)
        return queryset


class CropListView(AgriculturalCommodityListView):
    fixed_kind = AgriculturalCommodity.Kind.CROP


class LivestockListView(AgriculturalCommodityListView):
    fixed_kind = AgriculturalCommodity.Kind.LIVESTOCK


class CountyListView(generics.ListAPIView):
    serializer_class = CountySerializer
    pagination_class = None
    authentication_classes = []
    permission_classes = [AllowAny]

    def get_queryset(self):
        return County.objects.filter(is_active=True)


class MarketListView(generics.ListAPIView):
    serializer_class = MarketSerializer
    pagination_class = MarketPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "sub_county", "location", "county__name"]
    ordering_fields = ["name", "county__name", "market_type"]
    ordering = ["county__name", "name"]

    def get_queryset(self):
        queryset = Market.objects.filter(is_active=True, county__is_active=True).select_related("county")
        county_id = _positive_id(self.request.query_params, "county")
        if county_id is not None:
            queryset = queryset.filter(county_id=county_id)
        return queryset


class MarketPriceObservationListView(generics.ListAPIView):
    serializer_class = MarketPriceObservationSerializer
    pagination_class = MarketPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "commodity__name", "market__name",
        "county__name", "commodity__category__name", "source__name",
    ]
    ordering_fields = ["observation_date", "average_price", "minimum_price", "maximum_price"]
    ordering = ["-observation_date", "-id"]
    fixed_kind = None

    def get_queryset(self):
        queryset = MarketPriceObservation.objects.filter(
            status__in=[
                MarketPriceObservation.Status.VERIFIED,
                MarketPriceObservation.Status.ESTIMATED,
            ],
            commodity__is_active=True,
            market__is_active=True,
            county__is_active=True,
        ).select_related("commodity", "commodity__category", "market", "county", "unit", "source")

        requested_kind = self.request.query_params.get("kind")
        if self.fixed_kind and requested_kind not in {None, "", self.fixed_kind}:
            raise ValidationError({"kind": f"This endpoint only supports {self.fixed_kind} prices."})
        kind = self.fixed_kind or requested_kind
        if kind:
            if kind not in AgriculturalCommodity.Kind.values:
                raise ValidationError({"kind": "Choose crop or livestock."})
            queryset = queryset.filter(commodity__kind=kind)
        for param, field in (
            ("commodity", "commodity_id"),
            ("market", "market_id"),
            ("county", "county_id"),
            ("category", "commodity__category_id"),
            ("unit", "unit_id"),
        ):
            value = _positive_id(self.request.query_params, param)
            if value is not None:
                queryset = queryset.filter(**{field: value})
        price_type = self.request.query_params.get("price_type")
        if price_type:
            if price_type not in MarketPriceObservation.PriceType.values:
                raise ValidationError({"price_type": "Choose a supported price type."})
            queryset = queryset.filter(price_type=price_type)
        freshness = self.request.query_params.get("freshness")
        if freshness:
            if freshness not in {"fresh", "recent", "aging", "stale"}:
                raise ValidationError({"freshness": "Choose fresh, recent, aging, or stale."})
            today = timezone.localdate()
            fresh_days = getattr(settings, "MARKET_PRICE_FRESH_DAYS", 7)
            recent_days = getattr(settings, "MARKET_PRICE_RECENT_DAYS", 30)
            aging_days = getattr(settings, "MARKET_PRICE_AGING_DAYS", 90)
            if freshness == "fresh":
                queryset = queryset.filter(observation_date__gte=today - timedelta(days=fresh_days))
            elif freshness == "recent":
                queryset = queryset.filter(
                    observation_date__lt=today - timedelta(days=fresh_days),
                    observation_date__gte=today - timedelta(days=recent_days),
                )
            elif freshness == "aging":
                queryset = queryset.filter(
                    observation_date__lt=today - timedelta(days=recent_days),
                    observation_date__gte=today - timedelta(days=aging_days),
                )
            else:
                queryset = queryset.filter(observation_date__lt=today - timedelta(days=aging_days))
        date_after = self.request.query_params.get("observed_after")
        date_before = self.request.query_params.get("observed_before")
        parsed_after = parse_date(date_after) if date_after else None
        parsed_before = parse_date(date_before) if date_before else None
        if date_after and parsed_after is None:
            raise ValidationError({"observed_after": "Enter a valid date in YYYY-MM-DD format."})
        if date_before and parsed_before is None:
            raise ValidationError({"observed_before": "Enter a valid date in YYYY-MM-DD format."})
        if date_after:
            queryset = queryset.filter(observation_date__gte=parsed_after)
        if date_before:
            queryset = queryset.filter(observation_date__lte=parsed_before)
        if parsed_after and parsed_before and parsed_after > parsed_before:
            raise ValidationError({"observed_before": "This date must not precede observed_after."})
        return queryset


class CropPriceListView(MarketPriceObservationListView):
    fixed_kind = AgriculturalCommodity.Kind.CROP


class LivestockPriceListView(MarketPriceObservationListView):
    fixed_kind = AgriculturalCommodity.Kind.LIVESTOCK


class MarketPriceHistoryView(generics.ListAPIView):
    serializer_class = MarketPriceObservationSerializer
    pagination_class = MarketPagination

    def get_queryset(self):
        observation = get_object_or_404(
            MarketPriceObservation.objects.filter(
                status__in=[
                    MarketPriceObservation.Status.VERIFIED,
                    MarketPriceObservation.Status.ESTIMATED,
                ],
                commodity__is_active=True,
                commodity__category__is_active=True,
                market__is_active=True,
                county__is_active=True,
            ),
            pk=self.kwargs["observation_id"],
        )
        return MarketPriceObservation.objects.filter(
            commodity=observation.commodity,
            market=observation.market,
            price_type=observation.price_type,
            unit=observation.unit,
            unit_quantity=observation.unit_quantity,
            variety_grade=observation.variety_grade,
            observation_date__lte=observation.observation_date,
            status__in=[
                MarketPriceObservation.Status.VERIFIED,
                MarketPriceObservation.Status.ESTIMATED,
            ],
            commodity__is_active=True,
            commodity__category__is_active=True,
            market__is_active=True,
            county__is_active=True,
        ).select_related("commodity", "commodity__category", "market", "county", "unit", "source")


class MarketCoverageView(APIView):
    def get(self, request):
        today = timezone.localdate()
        recent_start = today - timedelta(
            days=getattr(settings, "MARKET_PRICE_RECENT_DAYS", 30)
        )
        published_statuses = [
            MarketPriceObservation.Status.VERIFIED,
            MarketPriceObservation.Status.ESTIMATED,
        ]
        published_filter = Q(price_observations__status__in=published_statuses)
        published_filter &= Q(
            price_observations__market__is_active=True,
            price_observations__commodity__is_active=True,
            price_observations__commodity__category__is_active=True,
        )
        county_rows = list(
            County.objects.filter(is_active=True)
            .annotate(
                observation_count=Count(
                    "price_observations", filter=published_filter, distinct=True
                ),
                market_count=Count(
                    "price_observations__market",
                    filter=published_filter,
                    distinct=True,
                ),
                commodity_count=Count(
                    "price_observations__commodity",
                    filter=published_filter,
                    distinct=True,
                ),
                recent_observation_count=Count(
                    "price_observations",
                    filter=published_filter
                    & Q(price_observations__observation_date__gte=recent_start),
                    distinct=True,
                ),
                latest_observation_date=Max(
                    "price_observations__observation_date", filter=published_filter
                ),
            )
            .values(
                "id", "name", "observation_count", "market_count", "commodity_count",
                "recent_observation_count", "latest_observation_date",
            )
        )
        active_markets = Market.objects.filter(is_active=True, county__is_active=True)
        active_market_ids = MarketPriceObservation.objects.filter(
            status__in=published_statuses,
            market__is_active=True,
            county__is_active=True,
        ).values_list("market_id", flat=True).distinct()
        recent_market_ids = MarketPriceObservation.objects.filter(
            status__in=published_statuses,
            market__is_active=True,
            county__is_active=True,
            observation_date__gte=recent_start,
        ).values_list("market_id", flat=True).distinct()
        return Response(
            {
                "active_counties": len(county_rows),
                "counties_with_prices": sum(row["observation_count"] > 0 for row in county_rows),
                "counties_with_recent_prices": sum(
                    row["recent_observation_count"] > 0 for row in county_rows
                ),
                "active_markets": active_markets.count(),
                "markets_with_prices": active_markets.filter(pk__in=active_market_ids).count(),
                "markets_with_recent_prices": active_markets.filter(
                    pk__in=recent_market_ids
                ).count(),
                "verified_observations": MarketPriceObservation.objects.filter(
                    status=MarketPriceObservation.Status.VERIFIED,
                    market__is_active=True,
                    commodity__is_active=True,
                    commodity__category__is_active=True,
                ).count(),
                "estimated_observations": MarketPriceObservation.objects.filter(
                    status=MarketPriceObservation.Status.ESTIMATED,
                    market__is_active=True,
                    commodity__is_active=True,
                    commodity__category__is_active=True,
                ).count(),
                "counties": county_rows,
            }
        )


class MarketOverviewView(APIView):
    def get(self, request):
        commodities = AgriculturalCommodity.objects.filter(
            is_active=True, market_available=True, category__is_active=True
        )
        return Response(
            {
                "crop_commodities": commodities.filter(
                    kind=AgriculturalCommodity.Kind.CROP
                ).count(),
                "livestock_commodities": commodities.filter(
                    kind=AgriculturalCommodity.Kind.LIVESTOCK
                ).count(),
                "crop_categories": CommodityCategory.objects.filter(
                    kind=AgriculturalCommodity.Kind.CROP, is_active=True
                ).count(),
                "livestock_categories": CommodityCategory.objects.filter(
                    kind=AgriculturalCommodity.Kind.LIVESTOCK, is_active=True
                ).count(),
                "coverage": MarketCoverageView().get(request).data,
                "latest_updates": MarketPriceObservationSerializer(
                    MarketPriceObservation.objects.filter(
                        status__in=[
                            MarketPriceObservation.Status.VERIFIED,
                            MarketPriceObservation.Status.ESTIMATED,
                        ],
                        commodity__is_active=True,
                        commodity__category__is_active=True,
                        market__is_active=True,
                        county__is_active=True,
                    )
                    .select_related(
                        "commodity", "commodity__category", "market", "county", "unit", "source"
                    )
                    .order_by("-observation_date", "-id")[:8],
                    many=True,
                ).data,
            }
        )


class MarketComparisonView(APIView):
    def post(self, request):
        serializer = MarketComparisonSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        today = timezone.localdate()
        observed_after = values.get("observed_after") or today - timedelta(days=30)
        observed_before = values.get("observed_before") or today
        queryset = MarketPriceObservation.objects.filter(
            status__in=[
                MarketPriceObservation.Status.VERIFIED,
                MarketPriceObservation.Status.ESTIMATED,
            ],
            commodity=values["commodity"],
            market__in=values["markets"],
            price_type=values["price_type"],
            commodity__is_active=True,
            commodity__category__is_active=True,
            market__is_active=True,
            county__is_active=True,
            observation_date__gte=observed_after,
            observation_date__lte=observed_before,
        )
        if values.get("unit"):
            queryset = queryset.filter(unit=values["unit"])
        if values.get("county"):
            queryset = queryset.filter(county=values["county"])
        if "variety_grade" in values:
            queryset = queryset.filter(variety_grade=values["variety_grade"])
        queryset = (
            queryset.annotate(
                market_latest=Window(
                    expression=RowNumber(),
                    partition_by=[
                        F("market_id"),
                        F("unit_id"),
                        F("unit_quantity"),
                        F("variety_grade"),
                        F("livestock_price_basis"),
                    ],
                    order_by=[F("observation_date").desc(), F("id").desc()],
                )
            )
            .filter(market_latest=1)
            .select_related("commodity", "commodity__category", "market", "county", "unit", "source")
            .order_by("unit_id", "unit_quantity", "variety_grade", "livestock_price_basis", "market__name")
        )

        groups = {}
        for observation in queryset:
            key = (
                observation.unit_id,
                observation.unit_quantity,
                observation.variety_grade,
                observation.livestock_price_basis,
            )
            group = groups.setdefault(key, {})
            group.setdefault(observation.market_id, observation)

        results = []
        for (unit_id, quantity, grade, basis), market_observations in groups.items():
            if len(market_observations) < 2:
                continue
            observations = list(market_observations.values())
            average_prices = [
                observation.average_price
                for observation in observations
                if observation.average_price is not None
            ]
            stats = {}
            if average_prices:
                stats = {
                    "lowest_market_average": str(min(average_prices)),
                    "highest_market_average": str(max(average_prices)),
                    "mean_of_market_averages": str(
                        sum(average_prices) / len(average_prices)
                    ),
                    "difference_between_market_averages": str(
                        max(average_prices) - min(average_prices)
                    ),
                }
            results.append(
                {
                    "unit": unit_id,
                    "unit_name": observations[0].unit.name,
                    "unit_quantity": str(quantity),
                    "variety_grade": grade,
                    "livestock_price_basis": basis,
                    "market_count": len(observations),
                    **stats,
                    "observations": MarketPriceObservationSerializer(
                        sorted(observations, key=lambda item: item.market.name), many=True
                    ).data,
                }
            )
        return Response(
            {
                "commodity": values["commodity"].name,
                "price_type": values["price_type"],
                "comparison_method": (
                    "Latest published observation per selected market within the date range; "
                    "groups are separate for unit, package quantity, grade, and livestock basis. "
                    "Mean is the unweighted mean of available market average prices."
                ),
                "groups": results,
                "comparison_period": {
                    "observed_after": observed_after.isoformat(),
                    "observed_before": observed_before.isoformat(),
                },
            }
        )


class MarketPriceTrendView(APIView):
    def get(self, request):
        commodity_id = _positive_id(request.query_params, "commodity")
        if commodity_id is None:
            raise ValidationError({"commodity": "Select a commodity ID."})
        unit_id = _positive_id(request.query_params, "unit")
        if unit_id is None:
            raise ValidationError({"unit": "Select a trading unit to keep the trend comparable."})
        unit = TradingUnit.objects.filter(pk=unit_id, is_active=True).first()
        if unit is None:
            raise ValidationError({"unit": "Select an active trading unit."})
        price_type = request.query_params.get("price_type")
        if price_type not in MarketPriceObservation.PriceType.values:
            raise ValidationError({"price_type": "Select a supported price classification."})
        quantity = request.query_params.get("unit_quantity")
        if not quantity:
            raise ValidationError(
                {"unit_quantity": "Select the reported package quantity to keep the trend comparable."}
            )
        try:
            quantity = Decimal(quantity)
        except InvalidOperation as exc:
            raise ValidationError({"unit_quantity": "Enter a valid decimal quantity."}) from exc
        if not quantity.is_finite() or quantity <= 0:
            raise ValidationError({"unit_quantity": "Quantity must be a positive finite number."})
        commodity = get_object_or_404(
            AgriculturalCommodity.objects.filter(
                is_active=True, market_available=True, category__is_active=True
            ),
            pk=commodity_id,
        )
        queryset = MarketPriceObservation.objects.filter(
            commodity=commodity,
            status__in=[
                MarketPriceObservation.Status.VERIFIED,
                MarketPriceObservation.Status.ESTIMATED,
            ],
            market__is_active=True,
            county__is_active=True,
            unit=unit,
            unit_quantity=quantity,
            price_type=price_type,
            variety_grade=request.query_params.get("variety_grade", ""),
        )
        for param, field in (
            ("market", "market_id"),
            ("county", "county_id"),
            ("unit", "unit_id"),
        ):
            value = _positive_id(request.query_params, param)
            if value is not None:
                queryset = queryset.filter(**{field: value})
        grade = request.query_params.get("variety_grade")
        if grade:
            queryset = queryset.filter(variety_grade=grade)
        after = request.query_params.get("observed_after")
        before = request.query_params.get("observed_before")
        parsed_after = parse_date(after) if after else None
        parsed_before = parse_date(before) if before else None
        if after and parsed_after is None:
            raise ValidationError({"observed_after": "Enter a valid date in YYYY-MM-DD format."})
        if before and parsed_before is None:
            raise ValidationError({"observed_before": "Enter a valid date in YYYY-MM-DD format."})
        if parsed_after and parsed_before and parsed_after > parsed_before:
            raise ValidationError({"observed_before": "End date must not precede start date."})
        if parsed_after:
            queryset = queryset.filter(observation_date__gte=parsed_after)
        if parsed_before:
            queryset = queryset.filter(observation_date__lte=parsed_before)

        queryset = queryset.select_related(
            "commodity", "commodity__category", "market", "county", "unit", "source"
        ).order_by("observation_date", "id")
        aggregates = queryset.aggregate(
            observation_count=Count("id"),
            period_average=Avg("average_price"),
            lowest_observation_average=Min("average_price"),
            highest_observation_average=Max("average_price"),
        )
        first = queryset.exclude(average_price__isnull=True).first()
        last = queryset.exclude(average_price__isnull=True).order_by(
            "-observation_date", "-id"
        ).first()
        movement = None
        if first and last and first.pk != last.pk and first.average_price != 0:
            movement = str(
                ((last.average_price - first.average_price) / first.average_price * 100).quantize(
                    Decimal("0.01")
                )
            )
        response = MarketPagination()
        page = response.paginate_queryset(queryset, request, view=self)
        data = MarketPriceObservationSerializer(page, many=True).data
        result = response.get_paginated_response(data)
        result.data["summary"] = {
            "observation_count": aggregates["observation_count"],
            "period_average": (
                str(aggregates["period_average"].quantize(Decimal("0.01")))
                if aggregates["period_average"] is not None else None
            ),
            "lowest_observation_average": (
                str(aggregates["lowest_observation_average"])
                if aggregates["lowest_observation_average"] is not None else None
            ),
            "highest_observation_average": (
                str(aggregates["highest_observation_average"])
                if aggregates["highest_observation_average"] is not None else None
            ),
            "percentage_change_first_to_last": movement,
            "comparison_period": {
                "first_observation_date": first.observation_date.isoformat() if first else None,
                "last_observation_date": last.observation_date.isoformat() if last else None,
            },
            "method": "Raw published observations; summary compares recorded average prices in date order without interpolation.",
        }
        return result


class LivestockValuationView(APIView):
    def post(self, request):
        serializer = LivestockValuationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        values = serializer.validated_data
        commodity = values["commodity"]
        market = values["market"]
        result = build_livestock_valuation(
            commodity=commodity,
            market=market,
            price_type=values["price_type"],
            weight_kg=values.get("weight_kg"),
            animal_count=values["animal_count"],
            breed=values.get("breed", ""),
            age_category=values.get("age_category", ""),
        )
        return Response(result)


class FarmerMarketWatchListCreateView(generics.ListCreateAPIView):
    serializer_class = FarmerMarketWatchSerializer
    permission_classes = [IsActiveMarketContributor]
    pagination_class = MarketPagination

    def get_queryset(self):
        return FarmerMarketWatch.objects.filter(user=self.request.user).select_related(
            "commodity", "county", "market"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FarmerMarketWatchDeleteView(DestroyAPIView):
    serializer_class = FarmerMarketWatchSerializer
    permission_classes = [IsActiveMarketContributor]
    queryset = FarmerMarketWatch.objects.all()

    def get_queryset(self):
        return super().get_queryset().filter(user=self.request.user)


class PriceSourceListView(generics.ListAPIView):
    serializer_class = PriceSourceSerializer
    pagination_class = None

    def get_queryset(self):
        return PriceSource.objects.filter(is_active=True)


class PriceImportBatchListView(generics.ListAPIView):
    serializer_class = PriceImportBatchSerializer
    pagination_class = MarketPagination
    permission_classes = [CanManageMarketImports]

    def get_queryset(self):
        return PriceImportBatch.objects.select_related("source", "created_by")


class PriceImportBatchDetailView(generics.RetrieveAPIView):
    serializer_class = PriceImportBatchSerializer
    permission_classes = [CanManageMarketImports]
    queryset = PriceImportBatch.objects.select_related("source", "created_by")


class PriceImportBatchUploadView(APIView):
    permission_classes = [CanManageMarketImports]
    parser_classes = [MultiPartParser]
    max_upload_bytes = 10 * 1024 * 1024

    def post(self, request, batch_id=None):
        uploaded_file = request.FILES.get("file")
        if uploaded_file is None:
            raise ValidationError({"file": "Upload a CSV or XLSX file."})
        if uploaded_file.size > self.max_upload_bytes:
            raise ValidationError({"file": "The upload exceeds the 10 MB limit."})
        extension = Path(PurePath(uploaded_file.name).name).suffix.lower()
        if extension not in {".csv", ".xlsx"}:
            raise ValidationError({"file": "Upload a .csv or .xlsx file."})

        source_id = request.data.get("source")
        if batch_id is None and not source_id:
            raise ValidationError({"source": "Select a configured price source."})
        batch = None
        if batch_id is not None:
            batch = get_object_or_404(
                PriceImportBatch.objects.filter(
                    created_by=request.user,
                    status=PriceImportBatch.Status.PREVIEWED,
                ),
                pk=batch_id,
            )
            source = batch.source
        else:
            try:
                source_id = int(source_id)
            except (TypeError, ValueError) as exc:
                raise ValidationError({"source": "Select a valid price source ID."}) from exc
            source = get_object_or_404(PriceSource, pk=source_id, is_active=True)

        if (
            source.source_type
            in {PriceSource.SourceType.OFFICIAL, PriceSource.SourceType.ORGANIZATION}
            and not source.data_use_authorized
        ):
            raise ValidationError(
                {"source": "Confirm data-use authorization before importing from this source."}
            )
        if source.source_type == PriceSource.SourceType.COMMUNITY:
            raise ValidationError(
                {"source": "Community reports must use the contributor review workflow."}
            )

        digest = hashlib.sha256()
        temporary_path = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="wb", suffix=extension, prefix="agrolink-market-", delete=False
            ) as temporary_file:
                temporary_path = Path(temporary_file.name)
                for chunk in uploaded_file.chunks():
                    digest.update(chunk)
                    temporary_file.write(chunk)
            file_hash = digest.hexdigest()
            if batch is not None and batch.file_sha256 != file_hash:
                raise ValidationError(
                    {"file": "The uploaded file differs from the preview; preview it again."}
                )
            output = tempfile.SpooledTemporaryFile(mode="w+", encoding="utf-8")
            try:
                command_options = {
                    "file": str(temporary_path),
                    "original_filename": PurePath(uploaded_file.name).name,
                    "provider": extension.lstrip("."),
                    "source_slug": source.slug,
                    "actor_email": request.user.email,
                    "dry_run": batch is None,
                    "batch_id": batch.pk if batch else None,
                }
                call_command("import_market_prices", stdout=output, **command_options)
            except CommandError as exc:
                output.seek(0)
                details = output.read().strip()
                failed_batch = (
                    PriceImportBatch.objects.filter(
                        source=source,
                        created_by=request.user,
                        file_sha256=file_hash,
                    )
                    .order_by("-id")
                    .first()
                )
                if failed_batch:
                    return Response(
                        {
                            "detail": str(exc),
                            "batch": PriceImportBatchSerializer(failed_batch).data,
                            "command_output": details,
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                raise ValidationError({"detail": str(exc)}) from exc
            finally:
                output.close()

            if batch:
                batch.refresh_from_db()
                result_batch = batch
            else:
                result_batch = PriceImportBatch.objects.get(
                    source=source,
                    created_by=request.user,
                    file_sha256=file_hash,
                    status=PriceImportBatch.Status.PREVIEWED,
                )
            return Response(
                PriceImportBatchSerializer(result_batch).data,
                status=status.HTTP_200_OK if batch else status.HTTP_201_CREATED,
            )
        finally:
            if temporary_path is not None:
                temporary_path.unlink(missing_ok=True)


class PriceImportBatchRollbackView(APIView):
    permission_classes = [CanManageMarketImports]

    def post(self, request, batch_id):
        batch = get_object_or_404(PriceImportBatch, pk=batch_id)
        serializer = PriceImportRollbackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        batch = rollback_price_import_batch(
            batch_id=batch.pk,
            actor=request.user,
            reason=serializer.validated_data["reason"],
        )
        return Response(PriceImportBatchSerializer(batch).data)


class PriceSubmissionListCreateView(generics.ListCreateAPIView):
    serializer_class = PriceSubmissionSerializer
    pagination_class = MarketPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "observation_date", "status"]
    ordering = ["-created_at", "-id"]
    permission_classes = [IsActiveMarketContributor]

    def get_queryset(self):
        return PriceSubmission.objects.filter(submitter=self.request.user).select_related(
            "commodity", "market", "county", "unit", "source"
        )

    @transaction.atomic
    def perform_create(self, serializer):
        submission = serializer.save()
        MarketPriceAuditEvent.objects.create(
            submission=submission,
            actor=self.request.user,
            action=MarketPriceAuditEvent.Action.SUBMITTED,
            new_status=submission.status,
            notes="Price submitted for verification.",
        )


class CommoditySuggestionListCreateView(generics.ListCreateAPIView):
    serializer_class = CommoditySuggestionSerializer
    pagination_class = MarketPagination
    permission_classes = [IsActiveMarketContributor]

    def get_queryset(self):
        return CommoditySuggestion.objects.filter(submitter=self.request.user).select_related("category")


class MarketPriceReviewQueueView(generics.ListAPIView):
    serializer_class = PriceSubmissionSerializer
    pagination_class = MarketPagination
    permission_classes = [CanReviewMarketData]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "observation_date"]
    ordering = ["created_at", "id"]

    def get_queryset(self):
        return PriceSubmission.objects.filter(status=PriceSubmission.ReviewStatus.PENDING).select_related(
            "commodity", "market", "county", "unit", "source", "submitter"
        )


class MarketPriceReviewView(APIView):
    permission_classes = [CanReviewMarketData]

    def post(self, request, submission_id):
        submission = get_object_or_404(PriceSubmission, pk=submission_id)
        serializer = PriceReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        submission, observation = review_price_submission(
            submission_id=submission.pk,
            reviewer=request.user,
            decision=serializer.validated_data["decision"],
            note=serializer.validated_data["note"],
        )
        response_data = PriceSubmissionSerializer(submission).data
        response_data["published_observation_id"] = observation.pk if observation else None
        return Response(response_data)


class CommoditySuggestionReviewQueueView(generics.ListAPIView):
    serializer_class = CommoditySuggestionSerializer
    pagination_class = MarketPagination
    permission_classes = [CanReviewMarketData]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "suggested_name"]
    ordering = ["created_at", "id"]

    def get_queryset(self):
        return CommoditySuggestion.objects.filter(status=CommoditySuggestion.Status.PENDING).select_related(
            "category", "submitter"
        )


class CommoditySuggestionReviewView(APIView):
    permission_classes = [CanReviewMarketData]

    def post(self, request, suggestion_id):
        suggestion = get_object_or_404(CommoditySuggestion, pk=suggestion_id)
        serializer = CommoditySuggestionReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        suggestion, commodity = review_commodity_suggestion(
            suggestion_id=suggestion.pk,
            reviewer=request.user,
            decision=serializer.validated_data["decision"],
            note=serializer.validated_data["note"],
        )
        response_data = CommoditySuggestionSerializer(suggestion).data
        response_data["approved_commodity_id"] = commodity.pk if commodity else None
        return Response(response_data)


class MarketPriceAuditListView(generics.ListAPIView):
    serializer_class = MarketPriceAuditEventSerializer
    pagination_class = MarketPagination
    permission_classes = [CanReviewMarketData]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "action"]
    ordering = ["-created_at", "-id"]

    def get_queryset(self):
        queryset = MarketPriceAuditEvent.objects.select_related(
            "actor", "submission__commodity", "observation__commodity", "suggestion"
        )
        submission_id = _positive_id(self.request.query_params, "submission")
        if submission_id is not None:
            queryset = queryset.filter(submission_id=submission_id)
        return queryset
