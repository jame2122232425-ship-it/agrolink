from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.utils.text import slugify
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.market_intelligence.models import (
    MarketPriceAuditEvent,
    MarketPriceObservation,
    PriceImportBatch,
    PriceSubmission,
    CommoditySuggestion,
    AgriculturalCommodity,
    TradingUnit,
)


def review_price_submission(*, submission_id, reviewer, decision, note):
    try:
        return _review_price_submission(
            submission_id=submission_id,
            reviewer=reviewer,
            decision=decision,
            note=note,
        )
    except IntegrityError as exc:
        raise ValidationError(
            {"detail": "This price observation conflicts with an existing market record."}
        ) from exc


@transaction.atomic
def _review_price_submission(*, submission_id, reviewer, decision, note):
    submission = (
        PriceSubmission.objects.select_for_update()
        .select_related("commodity", "market", "county", "source", "unit", "submitter")
        .get(pk=submission_id)
    )
    if submission.status != PriceSubmission.ReviewStatus.PENDING:
        raise ValidationError({"status": "This submission has already been reviewed."})

    previous_status = submission.status
    observation = None
    if decision == PriceSubmission.ReviewStatus.APPROVED:
        if (
            not submission.commodity.is_active
            or not submission.commodity.market_available
            or not submission.commodity.category.is_active
            or not submission.market.is_active
            or not submission.county.is_active
            or not submission.source.is_active
            or not submission.unit.is_active
        ):
            raise ValidationError(
                {"status": "This submission references inactive market data and cannot be approved."}
            )
        observation = MarketPriceObservation(
            commodity=submission.commodity,
            market=submission.market,
            county=submission.county,
            source=submission.source,
            price_type=submission.price_type,
            unit=submission.unit,
            unit_quantity=submission.unit_quantity,
            minimum_price=submission.minimum_price,
            maximum_price=submission.maximum_price,
            average_price=submission.average_price,
            variety_grade=submission.variety_grade,
            livestock_price_basis=submission.livestock_price_basis,
            livestock_breed=submission.livestock_breed,
            animal_age_category=submission.animal_age_category,
            animal_sex=submission.animal_sex,
            body_condition=submission.body_condition,
            animal_weight_kg=submission.animal_weight_kg,
            observation_date=submission.observation_date,
            status=MarketPriceObservation.Status.VERIFIED,
            submitted_by=submission.submitter,
            verified_by=reviewer,
            verification_note=note,
        )
        try:
            observation.full_clean()
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict) from exc
        observation.save()

    submission.status = decision
    submission.reviewed_by = reviewer
    submission.reviewed_at = timezone.now()
    submission.review_note = note
    submission.save(update_fields=("status", "reviewed_by", "reviewed_at", "review_note", "updated_at"))
    MarketPriceAuditEvent.objects.create(
        submission=submission,
        actor=reviewer,
        action=(
            MarketPriceAuditEvent.Action.APPROVED
            if decision == PriceSubmission.ReviewStatus.APPROVED
            else MarketPriceAuditEvent.Action.REJECTED
        ),
        previous_status=previous_status,
        new_status=decision,
        notes=note,
    )
    if observation:
        MarketPriceAuditEvent.objects.create(
            observation=observation,
            actor=reviewer,
            action=MarketPriceAuditEvent.Action.OBSERVATION_CREATED,
            new_status=observation.status,
            notes=f"Published from approved submission #{submission.pk}.",
        )
    return submission, observation


def review_commodity_suggestion(*, suggestion_id, reviewer, decision, note):
    try:
        return _review_commodity_suggestion(
            suggestion_id=suggestion_id,
            reviewer=reviewer,
            decision=decision,
            note=note,
        )
    except IntegrityError as exc:
        raise ValidationError(
            {"detail": "A commodity with this name or catalogue key already exists."}
        ) from exc


@transaction.atomic
def _review_commodity_suggestion(*, suggestion_id, reviewer, decision, note):
    suggestion = (
        CommoditySuggestion.objects.select_for_update()
        .select_related("category", "submitter")
        .get(pk=suggestion_id)
    )
    if suggestion.status != CommoditySuggestion.Status.PENDING:
        raise ValidationError({"status": "This commodity suggestion has already been reviewed."})

    commodity = None
    if decision == CommoditySuggestion.Status.APPROVED:
        if not suggestion.category.is_active:
            raise ValidationError({"category": "This category is no longer active."})
        if AgriculturalCommodity.objects.filter(
            kind=suggestion.kind, name__iexact=suggestion.suggested_name
        ).exists():
            raise ValidationError(
                {"suggested_name": "A catalogue commodity with this name already exists."}
            )
        base_slug = slugify(suggestion.suggested_name)[:120] or "commodity"
        slug = base_slug
        suffix = 0
        while AgriculturalCommodity.objects.filter(kind=suggestion.kind, slug=slug).exists():
            suffix += 1
            slug = f"{base_slug}-{suggestion.pk}-{suffix}"
        commodity = AgriculturalCommodity(
            kind=suggestion.kind,
            category=suggestion.category,
            name=suggestion.suggested_name,
            slug=slug,
            alternative_names=suggestion.alternative_names,
            description=suggestion.description,
            price_basis=suggestion.price_basis,
        )
        try:
            commodity.full_clean()
        except DjangoValidationError as exc:
            raise ValidationError(exc.message_dict) from exc
        commodity.save()

    previous_status = suggestion.status
    suggestion.status = decision
    suggestion.reviewed_by = reviewer
    suggestion.reviewed_at = timezone.now()
    suggestion.review_note = note
    suggestion.save(update_fields=("status", "reviewed_by", "reviewed_at", "review_note"))
    MarketPriceAuditEvent.objects.create(
        suggestion=suggestion,
        actor=reviewer,
        action=(
            MarketPriceAuditEvent.Action.SUGGESTION_APPROVED
            if decision == CommoditySuggestion.Status.APPROVED
            else MarketPriceAuditEvent.Action.SUGGESTION_REJECTED
        ),
        previous_status=previous_status,
        new_status=decision,
        notes=note,
    )
    return suggestion, commodity


@transaction.atomic
def rollback_price_import_batch(*, batch_id, actor, reason):
    batch = PriceImportBatch.objects.select_for_update().get(pk=batch_id)
    if batch.status not in {
        PriceImportBatch.Status.IMPORTED,
        PriceImportBatch.Status.PARTIAL,
    }:
        raise ValidationError({"status": "Only completed import batches can be rolled back."})

    observations = list(
        MarketPriceObservation.objects.select_for_update()
        .filter(import_batch=batch)
        .order_by("pk")
    )
    if len(observations) != batch.imported_rows or not observations or any(
        observation.status != MarketPriceObservation.Status.PENDING
        for observation in observations
    ):
        raise ValidationError(
            {"status": "A batch can be rolled back only while all imported observations remain pending."}
        )

    now = timezone.now()
    for observation in observations:
        observation.status = MarketPriceObservation.Status.REJECTED
        observation.verification_note = f"Import batch rolled back: {reason}"[:500]
        observation.save(update_fields=("status", "verification_note", "updated_at"))
        MarketPriceAuditEvent.objects.create(
            observation=observation,
            actor=actor,
            action=MarketPriceAuditEvent.Action.OBSERVATION_STATUS_CHANGED,
            previous_status=MarketPriceObservation.Status.PENDING,
            new_status=MarketPriceObservation.Status.REJECTED,
            notes=f"Import batch #{batch.pk} rolled back: {reason}"[:500],
        )

    batch.status = PriceImportBatch.Status.ROLLED_BACK
    batch.rolled_back_rows = len(observations)
    batch.rolled_back_at = now
    batch.rolled_back_by = actor
    batch.rollback_reason = reason
    batch.save(
        update_fields=(
            "status", "rolled_back_rows", "rolled_back_at", "rolled_back_by", "rollback_reason",
        )
    )
    return batch


def build_livestock_valuation(*, commodity, market, price_type, weight_kg=None,
                              animal_count=1, breed="", age_category=""):
    from apps.market_intelligence.models import AgriculturalCommodity

    basis = commodity.price_basis
    observations = MarketPriceObservation.objects.filter(
        commodity=commodity,
        market=market,
        price_type=price_type,
        livestock_price_basis=basis,
        status=MarketPriceObservation.Status.VERIFIED,
        observation_date__gte=timezone.localdate()
        - timedelta(days=getattr(settings, "MARKET_PRICE_RECENT_DAYS", 30)),
    ).select_related("unit", "source", "market", "county", "commodity")
    if breed:
        observations = observations.filter(livestock_breed__iexact=breed)
    if age_category:
        observations = observations.filter(animal_age_category__iexact=age_category)

    factors = []
    for observation in observations.order_by("-observation_date", "-id"):
        unit = observation.unit
        if basis == AgriculturalCommodity.PriceBasis.PER_ANIMAL:
            if unit.measure_kind != TradingUnit.MeasureKind.COUNT or unit.base_unit not in {"head", "animal"}:
                continue
            base_quantity = unit.quantity_in_base
        elif basis == AgriculturalCommodity.PriceBasis.LIVE_WEIGHT:
            if unit.measure_kind != TradingUnit.MeasureKind.MASS or unit.base_unit != "kg":
                continue
            base_quantity = unit.quantity_in_base
        else:
            continue
        if base_quantity is None:
            continue
        observation_quantity = observation.unit_quantity * base_quantity
        if observation_quantity <= 0:
            continue
        factor = Decimal(animal_count) / observation_quantity
        if basis == AgriculturalCommodity.PriceBasis.LIVE_WEIGHT:
            factor *= Decimal(weight_kg)
        factors.append((observation, factor))

    if not factors:
        return {
            "available": False,
            "message": "Insufficient verified market data to calculate a reliable estimate.",
            "price_basis": basis,
            "market_id": market.pk,
            "market_name": market.name,
            "county_name": market.county.name,
        }

    latest_date = factors[0][0].observation_date
    latest = [(observation, factor) for observation, factor in factors if observation.observation_date == latest_date]
    lows = []
    highs = []
    averages = []
    for observation, factor in latest:
        low_value = observation.minimum_price or observation.average_price
        high_value = observation.maximum_price or observation.average_price
        if low_value is not None:
            lows.append(low_value * factor)
        if high_value is not None:
            highs.append(high_value * factor)
        if observation.average_price is not None:
            averages.append(observation.average_price * factor)
    if not lows or not highs:
        return {
            "available": False,
            "message": "Insufficient verified market data to calculate a reliable estimate.",
            "price_basis": basis,
            "market_id": market.pk,
            "market_name": market.name,
            "county_name": market.county.name,
        }

    representative = latest[0][0]
    return {
        "available": True,
        "message": "Indicative market valuation - actual selling prices may vary.",
        "commodity_id": commodity.pk,
        "commodity_name": commodity.name,
        "market_id": market.pk,
        "market_name": market.name,
        "county_name": market.county.name,
        "price_type": price_type,
        "price_basis": basis,
        "weight_kg": str(weight_kg) if weight_kg is not None else None,
        "animal_count": animal_count,
        "minimum_value": str(min(lows).quantize(Decimal("0.01"))),
        "maximum_value": str(max(highs).quantize(Decimal("0.01"))),
        "average_value": (
            str((sum(averages) / len(averages)).quantize(Decimal("0.01")))
            if averages else None
        ),
        "observation_date": latest_date.isoformat(),
        "source_name": representative.source.name,
        "source_url": representative.source.url,
        "freshness": representative.freshness,
        "status": representative.status,
        "observation_count": len(latest),
    }
