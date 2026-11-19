from django.contrib import admin
from django.conf import settings
from django.db.models import Max
from django.utils import timezone
from datetime import timedelta

from apps.accounts.permissions import has_platform_permission
from apps.platform_admin.services import record_admin_action
from apps.market_intelligence.models import (
    AgriculturalCommodity,
    CommodityCategory,
    CommoditySuggestion,
    County,
    Market,
    MarketPriceAuditEvent,
    PriceImportBatch,
    MarketPriceObservation,
    PriceSource,
    PriceSubmission,
    TradingUnit,
)


class ReferenceDataAdmin(admin.ModelAdmin):
    def has_module_permission(self, request):
        return has_platform_permission(request.user, "manage_reference_data")

    def has_view_permission(self, request, obj=None):
        return has_platform_permission(request.user, "manage_reference_data")

    def has_add_permission(self, request):
        return has_platform_permission(request.user, "manage_reference_data")

    def has_change_permission(self, request, obj=None):
        return has_platform_permission(request.user, "manage_reference_data")

    def has_delete_permission(self, request, obj=None):
        return has_platform_permission(request.user, "manage_reference_data")

    def save_model(self, request, obj, form, change):
        previous = type(obj).objects.get(pk=obj.pk) if change else None
        before = {}
        if previous:
            for field_name in form.changed_data:
                model_field = obj._meta.get_field(field_name)
                if model_field.many_to_many or not model_field.concrete:
                    continue
                before[field_name] = str(getattr(previous, model_field.attname))
        super().save_model(request, obj, form, change)
        changes = {
            field_name: {
                "before": before.get(field_name),
                "after": str(getattr(obj, obj._meta.get_field(field_name).attname)),
            }
            for field_name in form.changed_data
            if field_name in before
        }
        record_admin_action(
            actor=request.user,
            action="market_reference_data_updated" if change else "market_reference_data_created",
            resource_type=obj._meta.label_lower,
            resource_id=obj.pk,
            reason="Managed through Django Admin.",
            changes=changes,
        )

    def save_related(self, request, form, formsets, change):
        before_units = {
            str(getattr(item, "pk", item))
            for item in (form.initial.get("supported_units") or [])
        }
        super().save_related(request, form, formsets, change)
        if "supported_units" in form.changed_data:
            after_units = sorted(
                str(getattr(item, "pk", item))
                for item in form.cleaned_data["supported_units"]
            )
            record_admin_action(
                actor=request.user,
                action="market_reference_data_updated",
                resource_type=form.instance._meta.label_lower,
                resource_id=form.instance.pk,
                reason="Supported trading units updated through Django Admin.",
                changes={"supported_units": {"before": sorted(before_units), "after": after_units}},
            )


@admin.register(CommodityCategory)
class CommodityCategoryAdmin(ReferenceDataAdmin):
    list_display = ("name", "kind", "is_active", "sort_order")
    list_filter = ("kind", "is_active")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(TradingUnit)
class TradingUnitAdmin(ReferenceDataAdmin):
    list_display = ("name", "abbreviation", "measure_kind", "base_unit", "is_active")
    list_filter = ("measure_kind", "is_active")
    search_fields = ("name", "abbreviation", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(AgriculturalCommodity)
class AgriculturalCommodityAdmin(ReferenceDataAdmin):
    list_display = ("name", "kind", "category", "price_basis", "market_available", "is_active")
    list_filter = ("kind", "category", "market_available", "is_active")
    search_fields = ("name", "scientific_name")
    filter_horizontal = ("supported_units",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(County)
class CountyAdmin(ReferenceDataAdmin):
    list_display = ("name", "code", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "code")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Market)
class MarketAdmin(ReferenceDataAdmin):
    list_display = ("name", "county", "sub_county", "market_type", "is_active")
    list_filter = ("county", "market_type", "is_active")
    search_fields = ("name", "county__name", "sub_county", "location")


@admin.register(PriceSource)
class PriceSourceAdmin(ReferenceDataAdmin):
    list_display = (
        "name", "source_type", "integration_status", "data_use_authorized", "is_active",
    )
    list_filter = ("source_type", "integration_status", "data_use_authorized", "is_active")
    search_fields = ("name", "slug", "attribution", "integration_status")
    fields = (
        "name", "slug", "source_type", "url", "attribution", "description",
        "data_type", "coverage", "access_method", "update_frequency", "usage_terms",
        "data_use_authorized", "integration_status", "is_active",
    )
    prepopulated_fields = {"slug": ("name",)}


@admin.register(PriceImportBatch)
class PriceImportBatchAdmin(admin.ModelAdmin):
    change_list_template = "admin/market_intelligence/priceimportbatch/change_list.html"
    list_display = (
        "file_name", "source", "status", "total_rows", "valid_rows", "invalid_rows",
        "duplicate_rows", "imported_rows", "created_by", "started_at",
    )
    list_filter = ("status", "source", "started_at")
    search_fields = ("file_name", "source__name", "created_by__email", "file_sha256")
    readonly_fields = (
        "source", "created_by", "file_name", "file_sha256", "status", "total_rows",
        "valid_rows", "invalid_rows", "duplicate_rows", "imported_rows", "pending_rows",
        "rolled_back_rows", "row_errors", "started_at", "completed_at", "rolled_back_at",
        "rolled_back_by", "rollback_reason",
    )

    def has_module_permission(self, request):
        return has_platform_permission(request.user, "manage_reference_data")

    def has_view_permission(self, request, obj=None):
        return has_platform_permission(request.user, "manage_reference_data")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        published = MarketPriceObservation.objects.filter(
            status__in=[
                MarketPriceObservation.Status.VERIFIED,
                MarketPriceObservation.Status.ESTIMATED,
            ],
            commodity__is_active=True,
            market__is_active=True,
            county__is_active=True,
        )
        stale_before = timezone.localdate() - timedelta(
            days=getattr(settings, "MARKET_PRICE_AGING_DAYS", 90)
        )
        latest_success = PriceImportBatch.objects.filter(
            status__in=[PriceImportBatch.Status.IMPORTED, PriceImportBatch.Status.PARTIAL]
        ).aggregate(value=Max("completed_at"))["value"]
        extra_context["market_data_coverage"] = {
            "counties_with_observations": County.objects.filter(
                is_active=True,
                price_observations__in=published,
            ).distinct().count(),
            "markets_with_observations": Market.objects.filter(
                is_active=True,
                price_observations__in=published,
            ).distinct().count(),
            "commodities_with_observations": AgriculturalCommodity.objects.filter(
                is_active=True,
                price_observations__in=published,
            ).distinct().count(),
            "crop_observations": published.filter(
                commodity__kind=AgriculturalCommodity.Kind.CROP
            ).count(),
            "livestock_observations": published.filter(
                commodity__kind=AgriculturalCommodity.Kind.LIVESTOCK
            ).count(),
            "verified_observations": published.filter(
                status=MarketPriceObservation.Status.VERIFIED
            ).count(),
            "estimated_observations": published.filter(
                status=MarketPriceObservation.Status.ESTIMATED
            ).count(),
            "stale_observations": published.filter(observation_date__lt=stale_before).count(),
            "latest_success": latest_success,
            "failed_batches": PriceImportBatch.objects.filter(
                status=PriceImportBatch.Status.FAILED
            ).count(),
            "counties_without_observations": County.objects.filter(is_active=True)
            .exclude(price_observations__in=published)
            .order_by("name")
            .values_list("name", flat=True),
            "sources_with_failed_batches": PriceSource.objects.filter(
                import_batches__status=PriceImportBatch.Status.FAILED
            ).distinct(),
        }
        return super().changelist_view(request, extra_context=extra_context)


@admin.register(MarketPriceObservation)
class MarketPriceObservationAdmin(ReferenceDataAdmin):
    list_display = (
        "commodity", "market", "observation_date", "average_price", "unit",
        "source", "status", "freshness",
    )
    list_filter = ("status", "price_type", "county", "commodity__kind", "observation_date")
    search_fields = ("commodity__name", "market__name", "county__name", "source__name")
    readonly_fields = ("published_at", "created_at", "updated_at")

    def save_model(self, request, obj, form, change):
        previous_status = ""
        if change:
            previous_status = MarketPriceObservation.objects.get(pk=obj.pk).status
        elif obj.submitted_by_id is None:
            obj.submitted_by = request.user
        if obj.status == MarketPriceObservation.Status.VERIFIED and obj.verified_by_id is None:
            obj.verified_by = request.user
        obj.full_clean()
        super().save_model(request, obj, form, change)
        if not change:
            action = MarketPriceAuditEvent.Action.OBSERVATION_CREATED
        elif previous_status != obj.status and obj.status in {
            MarketPriceObservation.Status.VERIFIED,
            MarketPriceObservation.Status.ESTIMATED,
        }:
            action = (
                MarketPriceAuditEvent.Action.OBSERVATION_VERIFIED
                if obj.status == MarketPriceObservation.Status.VERIFIED
                else MarketPriceAuditEvent.Action.OBSERVATION_STATUS_CHANGED
            )
        else:
            action = MarketPriceAuditEvent.Action.OBSERVATION_EDITED
        changed_fields = ", ".join(form.changed_data) or "No field changes recorded"
        MarketPriceAuditEvent.objects.create(
            observation=obj,
            actor=request.user,
            action=action,
            previous_status=previous_status,
            new_status=obj.status,
            notes=f"Authorized Django Admin change: {changed_fields}.",
        )


@admin.register(PriceSubmission)
class PriceSubmissionAdmin(admin.ModelAdmin):
    list_display = ("commodity", "market", "submitter", "observation_date", "status", "created_at")
    list_filter = ("status", "commodity__kind", "county", "created_at")
    search_fields = ("commodity__name", "market__name", "submitter__email")
    readonly_fields = (
        "commodity", "market", "county", "source", "price_type", "unit", "unit_quantity",
        "minimum_price", "maximum_price", "average_price", "variety_grade",
        "livestock_price_basis", "livestock_breed", "animal_age_category", "animal_sex", "body_condition",
        "animal_weight_kg", "observation_date", "submitter", "status", "reviewed_by",
        "reviewed_at", "review_note", "created_at", "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return has_platform_permission(request.user, "manage_reference_data")

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(CommoditySuggestion)
class CommoditySuggestionAdmin(ReferenceDataAdmin):
    list_display = ("suggested_name", "kind", "category", "submitter", "status", "created_at")
    list_filter = ("kind", "status", "category", "created_at")
    search_fields = ("suggested_name", "submitter__email")
    readonly_fields = (
        "kind", "suggested_name", "alternative_names", "price_basis", "category",
        "description", "submitter", "status", "reviewed_by", "reviewed_at",
        "review_note", "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(MarketPriceAuditEvent)
class MarketPriceAuditEventAdmin(admin.ModelAdmin):
    list_display = ("created_at", "target_name", "actor", "action", "previous_status", "new_status")
    list_filter = ("action", "created_at")
    search_fields = ("actor__email", "submission__commodity__name", "notes")
    readonly_fields = (
        "submission", "actor", "action", "previous_status", "new_status", "notes", "created_at"
    )

    def has_add_permission(self, request):
        return False

    def target_name(self, event):
        if event.submission_id:
            return event.submission.commodity.name
        if event.observation_id:
            return event.observation.commodity.name
        return event.suggestion.suggested_name
    target_name.short_description = "Commodity"

    def has_module_permission(self, request):
        return has_platform_permission(request.user, "manage_reference_data")

    def has_view_permission(self, request, obj=None):
        return has_platform_permission(request.user, "manage_reference_data")

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
