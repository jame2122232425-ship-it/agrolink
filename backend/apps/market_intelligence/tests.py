import csv
import tempfile
from datetime import timedelta
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import Client, TestCase
from django.utils import timezone
from openpyxl import Workbook
from rest_framework.test import APIClient

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
from apps.market_intelligence.providers import CSV_COLUMNS


User = get_user_model()


class MarketIntelligenceApiTests(TestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            email="farmer@example.test",
            password="test-password",
            first_name="Farm",
            last_name="User",
        )
        self.officer = User.objects.create_user(
            email="officer@example.test",
            password="test-password",
            first_name="Extension",
            last_name="Officer",
            role=User.Role.AGRICULTURAL_OFFICER,
        )
        self.county = County.objects.get(code="037")
        self.market = Market.objects.create(
            name="Test market",
            county=self.county,
            market_type=Market.MarketType.WHOLESALE,
        )
        self.source = PriceSource.objects.get(slug="community-submission")
        self.maize = AgriculturalCommodity.objects.get(kind="crop", slug="maize")
        self.kilogram = TradingUnit.objects.get(slug="kilogram")
        self.client = APIClient()
        self.client.force_authenticate(self.farmer)

    def make_observation(
        self, *, commodity=None, date=None, price_type="wholesale", unit=None,
        market=None, unit_quantity="1", average_price="100.00", variety_grade="",
    ):
        commodity = commodity or self.maize
        if unit is None:
            unit = self.kilogram
        observation = MarketPriceObservation(
            commodity=commodity,
            market=market or self.market,
            county=(market or self.market).county,
            source=self.source,
            price_type=price_type,
            unit=unit,
            unit_quantity=unit_quantity,
            average_price=average_price,
            variety_grade=variety_grade,
            livestock_price_basis=commodity.price_basis if commodity.kind == "livestock" else "",
            observation_date=date or timezone.localdate(),
            status=MarketPriceObservation.Status.VERIFIED,
            verified_by=self.officer,
        )
        observation.full_clean()
        observation.save()
        return observation

    def test_seeded_catalogue_covers_all_counties_and_is_searchable(self):
        self.assertEqual(County.objects.count(), 47)
        response = self.client.get("/api/v1/market/crops/?search=maize")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(item["name"] == "Maize" for item in response.data["results"]))

        response = self.client.get("/api/v1/market/crops/?search=mung")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(item["name"] == "Green grams" for item in response.data["results"]))

        response = self.client.get("/api/v1/market/crop-categories/")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(item["slug"] == "fodder-and-forage-crops" for item in response.data))

    def test_county_list_is_public_for_registration_forms(self):
        public_client = APIClient()
        public_client.credentials(HTTP_AUTHORIZATION="Bearer invalid-token")

        response = public_client.get("/api/v1/market/counties/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 47)

    def test_public_price_api_only_exposes_published_observations(self):
        published = self.make_observation()
        MarketPriceObservation.objects.create(
            commodity=self.maize,
            market=self.market,
            county=self.county,
            source=self.source,
            price_type=MarketPriceObservation.PriceType.RETAIL,
            unit=self.kilogram,
            unit_quantity="1",
            average_price="110.00",
            observation_date=timezone.localdate(),
            status=MarketPriceObservation.Status.PENDING,
        )

        response = self.client.get(f"/api/v1/market/prices/crops/?county={self.county.pk}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.data["results"]], [published.pk])
        self.assertEqual(response.data["results"][0]["status"], "verified")
        self.assertNotIn("verification_note", response.data["results"][0])

        response = self.client.get("/api/v1/market/prices/livestock/?kind=crop")
        self.assertEqual(response.status_code, 400)

    def test_livestock_price_basis_and_freshness_remain_explicit(self):
        cattle = AgriculturalCommodity.objects.get(kind="livestock", slug="live-cattle")
        head = TradingUnit.objects.get(slug="live-animal")
        observation = self.make_observation(
            commodity=cattle,
            unit=head,
            date=timezone.localdate() - timedelta(days=8),
        )
        response = self.client.get("/api/v1/market/prices/livestock/")
        self.assertEqual(response.status_code, 200)
        item = response.data["results"][0]
        self.assertEqual(item["id"], observation.pk)
        self.assertEqual(item["livestock_price_basis"], "per_animal")
        self.assertEqual(item["freshness"], "recent")

        with self.assertRaises(DjangoValidationError):
            invalid = MarketPriceObservation(
                commodity=self.maize,
                market=self.market,
                county=self.county,
                source=self.source,
                price_type="wholesale",
                unit=self.kilogram,
                unit_quantity="1",
                average_price="100",
                livestock_price_basis="per_animal",
                observation_date=timezone.localdate(),
            )
            invalid.full_clean()

    def test_freshness_filters_use_observation_age_not_publish_time(self):
        today = timezone.localdate()
        observations = {
            "recent": self.make_observation(date=today - timedelta(days=8)),
            "aging": self.make_observation(date=today - timedelta(days=31)),
            "stale": self.make_observation(date=today - timedelta(days=91)),
        }
        for freshness, expected in observations.items():
            response = self.client.get(f"/api/v1/market/prices/?freshness={freshness}")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(
                [item["id"] for item in response.data["results"]],
                [expected.pk],
            )

    def test_price_history_and_coverage_report_only_published_observations(self):
        first = self.make_observation(date=timezone.localdate() - timedelta(days=3))
        second = self.make_observation(
            date=timezone.localdate() - timedelta(days=2),
            price_type=MarketPriceObservation.PriceType.RETAIL,
        )
        response = self.client.get(f"/api/v1/market/prices/{first.pk}/history/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.data["results"]], [first.pk])

        response = self.client.get("/api/v1/market/coverage/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["active_counties"], 47)
        self.assertEqual(response.data["counties_with_prices"], 1)
        self.assertEqual(response.data["markets_with_prices"], 1)
        self.assertEqual(response.data["counties_with_recent_prices"], 1)
        self.assertEqual(response.data["markets_with_recent_prices"], 1)
        self.assertEqual(response.data["verified_observations"], 2)

    def test_comparison_only_compares_latest_same_unit_grade_and_price_type(self):
        second_market = Market.objects.create(name="Second market", county=self.county)
        third_market = Market.objects.create(name="Third market", county=self.county)
        first_observation = self.make_observation(average_price="100.00")
        second_observation = self.make_observation(
            market=second_market,
            average_price="120.00",
            date=timezone.localdate() - timedelta(days=1),
        )
        self.make_observation(
            market=third_market,
            unit=TradingUnit.objects.get(slug="50-kilogram-bag"),
            unit_quantity="1",
            average_price="5000.00",
        )
        response = self.client.post(
            "/api/v1/market/comparisons/",
            {
                "commodity": self.maize.pk,
                "county": self.county.pk,
                "markets": [self.market.pk, second_market.pk, third_market.pk],
                "price_type": "wholesale",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["groups"]), 1)
        group = response.data["groups"][0]
        self.assertEqual(group["market_count"], 2)
        self.assertEqual(
            {item["id"] for item in group["observations"]},
            {first_observation.pk, second_observation.pk},
        )
        self.assertEqual(group["difference_between_market_averages"], "20.00")

    def test_trend_returns_observed_points_and_explicit_period_change(self):
        first = self.make_observation(
            date=timezone.localdate() - timedelta(days=2),
            average_price="100.00",
        )
        last = self.make_observation(
            date=timezone.localdate() - timedelta(days=1),
            average_price="110.00",
        )
        response = self.client.get(
            f"/api/v1/market/prices/trend/?commodity={self.maize.pk}&market={self.market.pk}"
            f"&unit={self.kilogram.pk}&unit_quantity=1&price_type=wholesale&page_size=1"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["summary"]["observation_count"], 2)
        self.assertEqual(response.data["summary"]["percentage_change_first_to_last"], "10.00")
        self.assertEqual(
            [row["id"] for row in response.data["results"]],
            [first.pk],
        )
        self.assertIsNotNone(response.data["next"])
        second_page = self.client.get(response.data["next"])
        self.assertEqual([row["id"] for row in second_page.data["results"]], [last.pk])

    def test_live_weight_valuation_uses_per_kilogram_observations(self):
        cattle = AgriculturalCommodity.objects.get(kind="livestock", slug="live-cattle")
        live_weight_cattle = AgriculturalCommodity.objects.create(
            kind=AgriculturalCommodity.Kind.LIVESTOCK,
            category=cattle.category,
            name="Test live-weight cattle",
            slug="test-live-weight-cattle",
            price_basis=AgriculturalCommodity.PriceBasis.LIVE_WEIGHT,
        )
        live_weight_cattle.supported_units.add(self.kilogram)
        self.make_observation(
            commodity=live_weight_cattle,
            unit=self.kilogram,
            average_price="5.20",
        )
        response = self.client.post(
            "/api/v1/market/livestock/valuation/",
            {
                "commodity": live_weight_cattle.pk,
                "market": self.market.pk,
                "price_type": "wholesale",
                "weight_kg": "100",
                "animal_count": 2,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["available"])
        self.assertEqual(response.data["average_value"], "1040.00")

    def test_livestock_valuation_uses_fresh_verified_prices_and_rejects_basis_mixing(self):
        cattle = AgriculturalCommodity.objects.get(kind="livestock", slug="live-cattle")
        live_animal = TradingUnit.objects.get(slug="live-animal")
        self.make_observation(
            commodity=cattle,
            unit=live_animal,
            date=timezone.localdate() - timedelta(days=5),
            average_price="25000.00",
        )
        self.make_observation(
            commodity=cattle,
            unit=live_animal,
            date=timezone.localdate() - timedelta(days=45),
            average_price="24000.00",
        )
        response = self.client.post(
            "/api/v1/market/livestock/valuation/",
            {
                "commodity": cattle.pk,
                "market": self.market.pk,
                "price_type": "wholesale",
                "animal_count": 2,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["available"])
        self.assertEqual(response.data["minimum_value"], "50000.00")
        self.assertEqual(response.data["maximum_value"], "50000.00")
        self.assertEqual(response.data["freshness"], "fresh")

        beef = AgriculturalCommodity.objects.get(kind="livestock", slug="beef")
        response = self.client.post(
            "/api/v1/market/livestock/valuation/",
            {
                "commodity": beef.pk,
                "market": self.market.pk,
                "price_type": "retail",
                "animal_count": 1,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["available"])

    def test_watchlist_is_owner_scoped_and_rejects_duplicate_targets(self):
        response = self.client.post(
            "/api/v1/market/watchlist/",
            {"commodity": self.maize.pk},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        watch_id = response.data["id"]
        response = self.client.get("/api/v1/market/watchlist/")
        self.assertEqual(response.data["count"], 1)

        response = self.client.post(
            "/api/v1/market/watchlist/",
            {"commodity": self.maize.pk},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

        other_farmer = User.objects.create_user(
            email="other@example.test", password="test-password"
        )
        self.client.force_authenticate(other_farmer)
        self.assertEqual(self.client.get("/api/v1/market/watchlist/").data["count"], 0)
        self.assertEqual(
            self.client.delete(f"/api/v1/market/watchlist/{watch_id}/").status_code,
            404,
        )

    def test_submission_rejects_units_not_supported_by_commodity(self):
        litre = TradingUnit.objects.get(slug="litre")
        response = self.client.post(
            "/api/v1/market/price-submissions/",
            {
                "commodity": self.maize.pk,
                "market": self.market.pk,
                "price_type": "wholesale",
                "unit": litre.pk,
                "unit_quantity": "1",
                "average_price": "125.00",
                "observation_date": timezone.localdate().isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("unit", response.data)

    def test_farmer_submission_requires_review_before_publication(self):
        payload = {
            "commodity": self.maize.pk,
            "market": self.market.pk,
            "price_type": "wholesale",
            "unit": self.kilogram.pk,
            "unit_quantity": "1",
            "average_price": "125.00",
            "observation_date": timezone.localdate().isoformat(),
        }
        response = self.client.post("/api/v1/market/price-submissions/", payload, format="json")
        self.assertEqual(response.status_code, 201)
        submission = PriceSubmission.objects.get(pk=response.data["id"])
        self.assertEqual(submission.status, PriceSubmission.ReviewStatus.PENDING)
        self.assertFalse(MarketPriceObservation.objects.filter(status="verified").exists())

        self.client.force_authenticate(self.officer)
        response = self.client.post(
            f"/api/v1/market/staff/price-submissions/{submission.pk}/review/",
            {"decision": "approved", "note": "Cross-checked with the market enumerator."},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertGreater(response.data["published_observation_id"], 0)
        self.assertTrue(
            MarketPriceObservation.objects.filter(
                pk=response.data["published_observation_id"],
                status=MarketPriceObservation.Status.VERIFIED,
                verified_by=self.officer,
            ).exists()
        )
        self.assertSetEqual(
            set(
                MarketPriceAuditEvent.objects.filter(submission=submission).values_list(
                    "action", flat=True
                )
            ),
            {
                MarketPriceAuditEvent.Action.SUBMITTED,
                MarketPriceAuditEvent.Action.APPROVED,
            },
        )

    def test_only_market_reviewers_can_approve_submissions(self):
        submission = PriceSubmission.objects.create(
            commodity=self.maize,
            market=self.market,
            county=self.county,
            source=self.source,
            price_type="wholesale",
            unit=self.kilogram,
            unit_quantity="1",
            average_price="125.00",
            observation_date=timezone.localdate(),
            submitter=self.farmer,
        )
        response = self.client.post(
            f"/api/v1/market/staff/price-submissions/{submission.pk}/review/",
            {"decision": "approved", "note": "Review"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
        self.assertEqual(submission.status, PriceSubmission.ReviewStatus.PENDING)

    def test_commodity_suggestions_require_approval_before_catalogue_entry(self):
        category = CommodityCategory.objects.get(kind="crop", slug="cereals-and-grains")
        response = self.client.post(
            "/api/v1/market/commodity-suggestions/",
            {
                "kind": "crop",
                "suggested_name": "Test heritage grain",
                "category": category.pk,
                "alternative_names": ["local test name"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        suggestion = CommoditySuggestion.objects.get(pk=response.data["id"])
        self.assertFalse(
            AgriculturalCommodity.objects.filter(name="Test heritage grain").exists()
        )

        self.client.force_authenticate(self.officer)
        response = self.client.post(
            f"/api/v1/market/staff/commodity-suggestions/{suggestion.pk}/review/",
            {"decision": "approved", "note": "Confirmed as a crop commodity."},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            AgriculturalCommodity.objects.filter(name="Test heritage grain", is_active=True).exists()
        )
        self.assertTrue(
            MarketPriceAuditEvent.objects.filter(
                suggestion=suggestion,
                action=MarketPriceAuditEvent.Action.SUGGESTION_APPROVED,
            ).exists()
        )


class MarketCsvImportTests(TestCase):
    def setUp(self):
        self.actor = User.objects.create_superuser(
            email="admin@example.test",
            password="test-password",
            first_name="Admin",
            last_name="User",
        )
        self.county = County.objects.get(code="037")
        self.market = Market.objects.create(name="CSV test market", county=self.county)
        self.commodity = AgriculturalCommodity.objects.get(kind="crop", slug="maize")
        self.unit = TradingUnit.objects.get(slug="kilogram")
        self.source = PriceSource.objects.create(
            name="Configured test source",
            slug="configured-test-source",
            source_type=PriceSource.SourceType.OFFICIAL,
            url="https://example.test/market-data",
            data_use_authorized=True,
        )

    def test_import_admin_dashboard_renders_live_coverage(self):
        client = Client()
        client.force_login(self.actor)

        response = client.get("/admin/market_intelligence/priceimportbatch/")

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Published market-data coverage")
        self.assertContains(response, "Counties without observations")

    def _write_csv(self, values):
        temporary_file = tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", newline="", suffix=".csv", delete=False
        )
        writer = csv.DictWriter(temporary_file, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerow(values)
        temporary_file.close()
        self.addCleanup(Path(temporary_file.name).unlink, missing_ok=True)
        return temporary_file.name

    def test_csv_import_dry_run_and_import_only_create_pending_records(self):
        row = {column: "" for column in CSV_COLUMNS}
        row.update(
            {
                "commodity_slug": self.commodity.slug,
                "county_code": self.county.code,
                "market_id": str(self.market.pk),
                "price_type": "wholesale",
                "unit_slug": self.unit.slug,
                "unit_quantity": "1",
                "average_price": "100.00",
                "observation_date": timezone.localdate().isoformat(),
            }
        )
        csv_path = self._write_csv(row)
        call_command(
            "import_market_prices",
            file=csv_path,
            source_slug=self.source.slug,
            actor_email=self.actor.email,
            dry_run=True,
        )
        self.assertEqual(MarketPriceObservation.objects.count(), 0)

        call_command(
            "import_market_prices",
            file=csv_path,
            source_slug=self.source.slug,
            actor_email=self.actor.email,
        )
        observation = MarketPriceObservation.objects.get()
        self.assertEqual(observation.status, MarketPriceObservation.Status.PENDING)
        self.assertEqual(observation.source, self.source)
        self.assertIsNotNone(observation.import_batch_id)
        self.assertFalse(
            MarketPriceObservation.objects.filter(status=MarketPriceObservation.Status.VERIFIED).exists()
        )
        self.assertEqual(PriceImportBatch.objects.count(), 2)
        self.assertEqual(
            PriceImportBatch.objects.order_by("id").first().status,
            PriceImportBatch.Status.PREVIEWED,
        )
        imported_batch = PriceImportBatch.objects.order_by("-id").first()
        self.assertEqual(imported_batch.imported_rows, 1)
        self.assertEqual(imported_batch.pending_rows, 1)

    def test_csv_import_reports_existing_duplicates_without_duplicating_observations(self):
        row = {column: "" for column in CSV_COLUMNS}
        row.update(
            {
                "commodity_slug": self.commodity.slug,
                "county_code": self.county.code,
                "market_id": str(self.market.pk),
                "price_type": "wholesale",
                "unit_slug": self.unit.slug,
                "unit_quantity": "1",
                "average_price": "100.00",
                "observation_date": timezone.localdate().isoformat(),
            }
        )
        csv_path = self._write_csv(row)
        for _ in range(2):
            call_command(
                "import_market_prices",
                file=csv_path,
                source_slug=self.source.slug,
                actor_email=self.actor.email,
            )
        self.assertEqual(MarketPriceObservation.objects.count(), 1)
        duplicate_batch = PriceImportBatch.objects.order_by("-id").first()
        self.assertEqual(duplicate_batch.duplicate_rows, 1)
        self.assertEqual(duplicate_batch.imported_rows, 0)
        self.assertEqual(duplicate_batch.row_errors[0]["type"], "duplicate")

    def test_xlsx_import_creates_pending_observation_and_keeps_source_reference(self):
        row = {column: "" for column in CSV_COLUMNS}
        row.update(
            {
                "commodity_slug": self.commodity.slug,
                "county_code": self.county.code,
                "market_id": str(self.market.pk),
                "price_type": "wholesale",
                "unit_slug": self.unit.slug,
                "unit_quantity": "1",
                "average_price": "100.00",
                "observation_date": timezone.localdate().isoformat(),
                "source_reference": "provider-row-17",
            }
        )
        workbook = Workbook()
        sheet = workbook.active
        sheet.append(CSV_COLUMNS)
        sheet.append([row[column] for column in CSV_COLUMNS])
        temporary_file = tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False)
        temporary_file.close()
        self.addCleanup(Path(temporary_file.name).unlink, missing_ok=True)
        workbook.save(temporary_file.name)

        call_command(
            "import_market_prices",
            file=temporary_file.name,
            source_slug=self.source.slug,
            actor_email=self.actor.email,
        )
        observation = MarketPriceObservation.objects.get()
        self.assertEqual(observation.status, MarketPriceObservation.Status.PENDING)
        self.assertEqual(observation.source_reference, "provider-row-17")
        self.assertEqual(PriceImportBatch.objects.get().imported_rows, 1)

    def test_official_source_requires_explicit_data_use_authorization(self):
        self.source.data_use_authorized = False
        self.source.save(update_fields=("data_use_authorized",))
        csv_path = self._write_csv({column: "" for column in CSV_COLUMNS})
        with self.assertRaises(CommandError):
            call_command(
                "import_market_prices",
                file=csv_path,
                source_slug=self.source.slug,
                actor_email=self.actor.email,
            )
        self.assertEqual(PriceImportBatch.objects.count(), 0)

    def test_import_batch_endpoint_is_limited_to_market_data_administrators(self):
        batch = PriceImportBatch.objects.create(
            source=self.source,
            created_by=self.actor,
            file_name="prices.csv",
            status=PriceImportBatch.Status.PREVIEWED,
        )
        client = APIClient()
        response = client.get("/api/v1/market/staff/import-batches/")
        self.assertEqual(response.status_code, 401)

        farmer = User.objects.create_user(
            email="batch-farmer@example.test",
            password="test-password",
            first_name="Farm",
            last_name="User",
        )
        client.force_authenticate(farmer)
        self.assertEqual(client.get("/api/v1/market/staff/import-batches/").status_code, 403)

        client.force_authenticate(self.actor)
        response = client.get(f"/api/v1/market/staff/import-batches/{batch.pk}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["file_name"], "prices.csv")

    def test_staff_upload_previews_and_confirms_same_file(self):
        row = {column: "" for column in CSV_COLUMNS}
        row.update(
            {
                "commodity_slug": self.commodity.slug,
                "county_code": self.county.code,
                "market_id": str(self.market.pk),
                "price_type": "wholesale",
                "unit_slug": self.unit.slug,
                "unit_quantity": "1",
                "average_price": "100.00",
                "observation_date": timezone.localdate().isoformat(),
            }
        )
        csv_path = self._write_csv(row)
        client = APIClient()
        client.force_authenticate(self.actor)
        with open(csv_path, "rb") as upload:
            response = client.post(
                "/api/v1/market/staff/import-batches/upload/",
                {"source": self.source.pk, "file": upload},
                format="multipart",
            )
        self.assertEqual(response.status_code, 201)
        batch_id = response.data["id"]
        self.assertEqual(response.data["status"], PriceImportBatch.Status.PREVIEWED)
        self.assertEqual(MarketPriceObservation.objects.count(), 0)
        self.assertEqual(response.data["file_name"], Path(csv_path).name)

        with open(csv_path, "rb") as upload:
            response = client.post(
                f"/api/v1/market/staff/import-batches/{batch_id}/confirm/",
                {"file": upload},
                format="multipart",
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], PriceImportBatch.Status.IMPORTED)
        self.assertEqual(response.data["pending_rows"], 1)
        self.assertEqual(
            MarketPriceObservation.objects.get().import_batch_id,
            batch_id,
        )
        response = client.post(
            f"/api/v1/market/staff/import-batches/{batch_id}/rollback/",
            {"reason": "The source file was superseded by a corrected authorized export."},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], PriceImportBatch.Status.ROLLED_BACK)
        self.assertEqual(response.data["rolled_back_rows"], 1)
        self.assertEqual(
            MarketPriceObservation.objects.get(import_batch_id=batch_id).status,
            MarketPriceObservation.Status.REJECTED,
        )

    def test_import_keeps_valid_rows_and_reports_invalid_rows(self):
        valid_row = {column: "" for column in CSV_COLUMNS}
        valid_row.update(
            {
                "commodity_slug": self.commodity.slug,
                "county_code": self.county.code,
                "market_id": str(self.market.pk),
                "price_type": "wholesale",
                "unit_slug": self.unit.slug,
                "unit_quantity": "1",
                "average_price": "100.00",
                "observation_date": timezone.localdate().isoformat(),
            }
        )
        invalid_row = dict(valid_row, commodity_slug="unknown-crop")
        temporary_file = tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", newline="", suffix=".csv", delete=False
        )
        writer = csv.DictWriter(temporary_file, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerow(valid_row)
        writer.writerow(invalid_row)
        temporary_file.close()
        self.addCleanup(Path(temporary_file.name).unlink, missing_ok=True)

        call_command(
            "import_market_prices",
            file=temporary_file.name,
            source_slug=self.source.slug,
            actor_email=self.actor.email,
        )
        batch = PriceImportBatch.objects.get()
        self.assertEqual(batch.total_rows, 2)
        self.assertEqual(batch.valid_rows, 1)
        self.assertEqual(batch.invalid_rows, 1)
        self.assertEqual(batch.imported_rows, 1)
        self.assertEqual(batch.status, PriceImportBatch.Status.PARTIAL)
        self.assertEqual(batch.row_errors[0]["row"], 3)
        self.assertEqual(MarketPriceObservation.objects.count(), 1)

    def test_csv_import_rejects_malformed_headers(self):
        temporary_file = tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", newline="", suffix=".csv", delete=False
        )
        temporary_file.write("price,market\n100,test\n")
        temporary_file.close()
        self.addCleanup(Path(temporary_file.name).unlink, missing_ok=True)

        with self.assertRaises(CommandError):
            call_command(
                "import_market_prices",
                file=temporary_file.name,
                source_slug=self.source.slug,
                actor_email=self.actor.email,
            )
