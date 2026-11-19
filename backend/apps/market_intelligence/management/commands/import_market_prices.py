import hashlib
from decimal import Decimal, InvalidOperation
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.dateparse import parse_date

from apps.accounts.permissions import has_platform_permission
from apps.market_intelligence.models import (
    AgriculturalCommodity,
    County,
    Market,
    MarketPriceAuditEvent,
    MarketPriceObservation,
    PriceImportBatch,
    PriceSource,
    TradingUnit,
)
from apps.market_intelligence.providers import MarketImportError, get_market_data_provider


def _decimal(value, field, row_number, *, required=False):
    if not value.strip():
        if required:
            raise CommandError(f"Row {row_number}: {field} is required.")
        return None
    try:
        parsed = Decimal(value.strip())
    except InvalidOperation as exc:
        raise CommandError(f"Row {row_number}: {field} must be a decimal number.") from exc
    if not parsed.is_finite():
        raise CommandError(f"Row {row_number}: {field} must be a finite decimal number.")
    return parsed


def _file_sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class Command(BaseCommand):
    help = "Preview or import traceable market observations as pending records."

    def add_arguments(self, parser):
        parser.add_argument("--file", required=True, help="Path to a UTF-8 CSV or .xlsx file.")
        parser.add_argument("--original-filename", help="Original upload name stored for the import batch.")
        parser.add_argument(
            "--provider",
            default=None,
            choices=("csv", "xlsx"),
            help="File adapter (inferred from the extension when omitted).",
        )
        parser.add_argument("--source-slug", required=True, help="Configured price-source slug.")
        parser.add_argument("--actor-email", required=True, help="Authorized market-data administrator.")
        parser.add_argument(
            "--batch-id",
            type=int,
            help="Reuse a matching preview batch when confirming an API upload.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate and record a preview without saving price observations.",
        )

    def handle(self, *args, **options):
        source = PriceSource.objects.filter(
            slug=options["source_slug"], is_active=True
        ).first()
        if source is None:
            raise CommandError("The specified active price source does not exist.")
        if source.source_type == PriceSource.SourceType.COMMUNITY:
            raise CommandError(
                "Community submissions must use the review workflow, not the import command."
            )
        if (
            source.source_type
            in {PriceSource.SourceType.OFFICIAL, PriceSource.SourceType.ORGANIZATION}
            and not source.data_use_authorized
        ):
            raise CommandError(
                "This source is not marked as authorized for data import. Confirm its terms first."
            )

        User = get_user_model()
        actor = User.objects.filter(email__iexact=options["actor_email"]).first()
        if (
            actor is None
            or not actor.is_active
            or actor.account_status != User.AccountStatus.ACTIVE
            or not (actor.is_superuser or has_platform_permission(actor, "manage_reference_data"))
        ):
            raise CommandError("The specified account is not authorized to import market data.")

        file_path = Path(options["file"])
        original_filename = Path(options["original_filename"] or file_path.name).name[:255]
        provider_name = options["provider"] or file_path.suffix.lower().lstrip(".")
        try:
            file_hash = _file_sha256(file_path)
        except OSError as exc:
            raise CommandError(f"Unable to read the import file: {exc}") from exc
        if provider_name not in {"csv", "xlsx"}:
            raise CommandError("Choose a supported .csv or .xlsx file.")

        if options["batch_id"]:
            batch = PriceImportBatch.objects.filter(
                pk=options["batch_id"],
                source=source,
                created_by=actor,
                file_sha256=file_hash,
                status=PriceImportBatch.Status.PREVIEWED,
            ).first()
            if batch is None:
                raise CommandError("The preview batch, actor, source, or uploaded file does not match.")
            batch.file_name = original_filename
            batch.total_rows = 0
            batch.valid_rows = 0
            batch.invalid_rows = 0
            batch.duplicate_rows = 0
            batch.imported_rows = 0
            batch.pending_rows = 0
            batch.row_errors = []
            batch.completed_at = None
            batch.status = PriceImportBatch.Status.FAILED
            batch.save(
                update_fields=(
                    "file_name", "total_rows", "valid_rows", "invalid_rows", "duplicate_rows",
                    "imported_rows", "pending_rows", "row_errors", "completed_at", "status",
                )
            )
        else:
            batch = PriceImportBatch.objects.create(
                source=source,
                created_by=actor,
                file_name=original_filename,
                file_sha256=file_hash,
                status=PriceImportBatch.Status.FAILED,
            )
        staged = []
        seen = set()
        try:
            provider = get_market_data_provider(provider_name, file_path)
            for row_number, row in provider.iter_rows():
                batch.total_rows += 1
                try:
                    observation = self._build_observation(row_number, row, source, actor, batch)
                    observation.full_clean(validate_unique=False, validate_constraints=False)
                except (CommandError, DjangoValidationError) as exc:
                    batch.invalid_rows += 1
                    batch.row_errors.append(
                        {"row": row_number, "type": "invalid", "message": str(exc)}
                    )
                    continue

                batch.valid_rows += 1
                duplicate_key = self._duplicate_key(observation)
                external_key = (
                    ("source_reference", source.pk, observation.source_reference)
                    if observation.source_reference
                    else None
                )
                if duplicate_key in seen or (
                    external_key is not None and external_key in seen
                ) or self._exists_in_database(observation):
                    batch.duplicate_rows += 1
                    batch.row_errors.append(
                        {
                            "row": row_number,
                            "type": "duplicate",
                            "message": "An observation with this source reference or market identity already exists.",
                        }
                    )
                    continue
                seen.add(duplicate_key)
                if external_key is not None:
                    seen.add(external_key)
                staged.append(observation)
        except MarketImportError as exc:
            batch.row_errors.append({"row": 0, "type": "file", "message": str(exc)})
            batch.completed_at = timezone.now()
            batch.save(
                update_fields=("total_rows", "row_errors", "completed_at", "status")
            )
            raise CommandError(str(exc)) from exc

        if batch.total_rows == 0:
            batch.row_errors.append(
                {"row": 0, "type": "file", "message": "The file contains no observations."}
            )
            batch.completed_at = timezone.now()
            batch.save(update_fields=("row_errors", "completed_at"))
            raise CommandError("The file contains no observations.")

        if options["dry_run"]:
            batch.status = PriceImportBatch.Status.PREVIEWED
        else:
            try:
                with transaction.atomic():
                    for observation in staged:
                        observation.save()
                        MarketPriceAuditEvent.objects.create(
                            observation=observation,
                            actor=actor,
                            action=MarketPriceAuditEvent.Action.OBSERVATION_CREATED,
                            new_status=observation.status,
                            notes=f"Imported in batch #{batch.pk} from source '{source.slug}'.",
                        )
                batch.imported_rows = len(staged)
                batch.pending_rows = len(staged)
                batch.status = (
                    PriceImportBatch.Status.PARTIAL
                    if batch.invalid_rows or batch.duplicate_rows
                    else PriceImportBatch.Status.IMPORTED
                )
            except (IntegrityError, DjangoValidationError) as exc:
                batch.status = PriceImportBatch.Status.FAILED
                batch.row_errors.append(
                    {
                        "row": 0,
                        "type": "import",
                        "message": "The import transaction failed; no rows were saved.",
                    }
                )
                batch.completed_at = timezone.now()
                batch.save(
                    update_fields=(
                        "status", "row_errors", "completed_at", "total_rows", "valid_rows",
                        "invalid_rows", "duplicate_rows",
                    )
                )
                raise CommandError("The import transaction failed; no rows were saved.") from exc

        batch.completed_at = timezone.now()
        batch.save(
            update_fields=(
                "status", "total_rows", "valid_rows", "invalid_rows", "duplicate_rows",
                "imported_rows", "pending_rows", "row_errors", "completed_at",
            )
        )
        self._write_summary(batch)

    @staticmethod
    def _duplicate_key(observation):
        return (
            observation.commodity_id,
            observation.market_id,
            observation.source_id,
            observation.price_type,
            observation.unit_id,
            observation.unit_quantity,
            observation.observation_date,
            observation.variety_grade,
        )

    @staticmethod
    def _exists_in_database(observation):
        queryset = MarketPriceObservation.objects.filter(
            commodity=observation.commodity,
            market=observation.market,
            source=observation.source,
            price_type=observation.price_type,
            unit=observation.unit,
            unit_quantity=observation.unit_quantity,
            observation_date=observation.observation_date,
            variety_grade=observation.variety_grade,
        ).exclude(status=MarketPriceObservation.Status.REJECTED)
        if observation.source_reference:
            queryset = queryset | MarketPriceObservation.objects.filter(
                source=observation.source,
                source_reference=observation.source_reference,
            ).exclude(status=MarketPriceObservation.Status.REJECTED)
        return queryset.exists()

    def _build_observation(self, row_number, row, source, actor, batch):
        commodity = AgriculturalCommodity.objects.filter(
            slug=row["commodity_slug"].strip(),
            is_active=True,
            market_available=True,
            category__is_active=True,
        ).first()
        if commodity is None:
            raise CommandError(f"Row {row_number}: unknown or inactive commodity slug.")

        county = County.objects.filter(code=row["county_code"].strip(), is_active=True).first()
        if county is None:
            raise CommandError(f"Row {row_number}: unknown or inactive county code.")

        try:
            market_id = int(row["market_id"].strip())
        except ValueError as exc:
            raise CommandError(f"Row {row_number}: market_id must be a positive integer.") from exc
        if market_id <= 0:
            raise CommandError(f"Row {row_number}: market_id must be a positive integer.")
        market = Market.objects.filter(
            pk=market_id, is_active=True, county__is_active=True
        ).select_related("county").first()
        if market is None or market.county_id != county.pk:
            raise CommandError(f"Row {row_number}: market_id does not belong to county_code.")

        unit = TradingUnit.objects.filter(slug=row["unit_slug"].strip(), is_active=True).first()
        if unit is None:
            raise CommandError(f"Row {row_number}: unknown or inactive trading-unit slug.")
        if not commodity.supported_units.filter(pk=unit.pk).exists():
            raise CommandError(f"Row {row_number}: this unit is not supported by the commodity.")

        price_type = row["price_type"].strip()
        if price_type not in MarketPriceObservation.PriceType.values:
            raise CommandError(f"Row {row_number}: unsupported price_type.")
        observation_date = parse_date(row["observation_date"].strip())
        if observation_date is None:
            raise CommandError(f"Row {row_number}: observation_date must use YYYY-MM-DD format.")

        return MarketPriceObservation(
            commodity=commodity,
            market=market,
            county=county,
            source=source,
            import_batch=batch,
            source_reference=row.get("source_reference", "").strip(),
            price_type=price_type,
            unit=unit,
            unit_quantity=_decimal(row["unit_quantity"], "unit_quantity", row_number, required=True),
            minimum_price=_decimal(row["minimum_price"], "minimum_price", row_number),
            maximum_price=_decimal(row["maximum_price"], "maximum_price", row_number),
            average_price=_decimal(row["average_price"], "average_price", row_number),
            variety_grade=row["variety_grade"].strip(),
            livestock_price_basis=row["livestock_price_basis"].strip(),
            livestock_breed=row["livestock_breed"].strip(),
            animal_age_category=row["animal_age_category"].strip(),
            animal_sex=row["animal_sex"].strip(),
            body_condition=row["body_condition"].strip(),
            animal_weight_kg=_decimal(row["animal_weight_kg"], "animal_weight_kg", row_number),
            observation_date=observation_date,
            status=MarketPriceObservation.Status.PENDING,
            submitted_by=actor,
        )

    def _write_summary(self, batch):
        label = "Preview" if batch.status == PriceImportBatch.Status.PREVIEWED else "Import"
        self.stdout.write(
            f"{label} batch #{batch.pk}: total={batch.total_rows}, valid={batch.valid_rows}, "
            f"invalid={batch.invalid_rows}, duplicates={batch.duplicate_rows}, "
            f"imported={batch.imported_rows}, pending_verification={batch.pending_rows}."
        )
        for error in batch.row_errors:
            self.stdout.write(
                self.style.WARNING(
                    f"Row {error['row']} [{error['type']}]: {error['message']}"
                )
            )
