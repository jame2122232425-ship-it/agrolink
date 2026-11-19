from datetime import timedelta
from io import BytesIO
from tempfile import TemporaryDirectory

from PIL import Image
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.accounts.models import FarmerProfile, User
from apps.common.storage import private_media_storage
from apps.crops.models import Crop, CropActivity, CropGrowthStage, CropHealthObservation
from apps.farms.models import Farm, FarmPlot


class CropAPITests(APITestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            email="crop-farmer@example.test",
            password="Secure-test-pass-2026!",
            first_name="Crop",
            last_name="Farmer",
        )
        FarmerProfile.objects.create(user=self.farmer)
        self.other_farmer = User.objects.create_user(
            email="other-crop-farmer@example.test",
            password="Secure-test-pass-2026!",
            first_name="Other",
            last_name="Farmer",
        )
        self.farm = Farm.objects.create(farmer=self.farmer, name="Busia Farm", size="5.00")
        self.other_farm = Farm.objects.create(
            farmer=self.other_farmer, name="Private Farm", size="2.00"
        )
        self.plot = FarmPlot.objects.create(farm=self.farm, name="North Plot", size="2.00")
        self.other_plot = FarmPlot.objects.create(
            farm=self.other_farm, name="Private Plot", size="1.00"
        )
        self.stage = CropGrowthStage.objects.get(name="Vegetative growth")
        self.client.force_authenticate(self.farmer)

    def crop_payload(self, **overrides):
        payload = {
            "farm": self.farm.pk,
            "plot": self.plot.pk,
            "crop_name": "Maize",
            "variety": "H513",
            "planting_date": "2026-03-01",
            "expected_harvest_date": "2026-08-01",
            "area_planted": "1.25",
            "area_unit": "acres",
            "growth_stage": self.stage.pk,
            "status": "active",
        }
        payload.update(overrides)
        return payload

    def test_create_edit_and_custom_crop_names(self):
        response = self.client.post(
            "/api/v1/crops/", self.crop_payload(crop_name="Indigenous amaranth"), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        crop = Crop.objects.get(pk=response.data["id"])
        self.assertEqual(crop.farm, self.farm)
        self.assertEqual(crop.plot, self.plot)
        self.assertEqual(crop.crop_name, "Indigenous amaranth")

        response = self.client.patch(
            f"/api/v1/crops/{crop.pk}/",
            {"variety": "Local seed"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        crop.refresh_from_db()
        self.assertEqual(crop.variety, "Local seed")

    def test_rejects_foreign_farm_plot_mismatch_and_invalid_dates(self):
        response = self.client.post(
            "/api/v1/crops/", self.crop_payload(farm=self.other_farm.pk), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(
            "/api/v1/crops/", self.crop_payload(plot=self.other_plot.pk), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(
            "/api/v1/crops/",
            self.crop_payload(
                planting_date="2026-08-01", expected_harvest_date="2026-07-01"
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(
            "/api/v1/crops/",
            self.crop_payload(area_planted="0"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_crop_and_related_records_are_owner_scoped(self):
        crop = Crop.objects.create(
            farm=self.other_farm,
            crop_name="Rice",
            area_planted="1.00",
        )
        response = self.client.get(f"/api/v1/crops/{crop.pk}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self.client.post(
            f"/api/v1/crops/{crop.pk}/health-records/",
            {"symptoms_observed": "Leaf yellowing", "severity": "moderate"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_health_observation_and_activity_are_recorded_by_authenticated_farmer(self):
        crop = Crop.objects.create(
            farm=self.farm,
            crop_name="Tomatoes",
            area_planted="0.50",
            growth_stage=self.stage,
        )
        response = self.client.post(
            f"/api/v1/crops/{crop.pk}/health-records/",
            {
                "symptoms_observed": "Leaf spots and yellowing",
                "general_condition": "fair",
                "severity": "moderate",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        observation = CropHealthObservation.objects.get(pk=response.data["id"])
        self.assertEqual(observation.recorded_by, self.farmer)
        self.assertFalse(hasattr(observation, "diagnosis"))

        response = self.client.post(
            f"/api/v1/crops/{crop.pk}/activities/",
            {
                "activity_type": "irrigation",
                "description": "Watered the beds",
                "quantity": "10",
                "unit": "litres",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CropActivity.objects.get(pk=response.data["id"]).recorded_by, self.farmer)

        response = self.client.get(f"/api/v1/crops/{crop.pk}/health-records/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_growth_stage_catalog_is_available(self):
        response = self.client.get("/api/v1/crop-growth-stages/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        names = {row["name"] for row in response.data}
        self.assertIn("Vegetative growth", names)

    def test_crop_serializer_exposes_plot_and_stage_names(self):
        crop = Crop.objects.create(
            farm=self.farm,
            plot=self.plot,
            crop_name="Maize",
            area_planted="1.00",
            growth_stage=self.stage,
        )

        response = self.client.get(f"/api/v1/crops/{crop.pk}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["plot_name"], "North Plot")
        self.assertEqual(response.data["growth_stage_name"], self.stage.name)

    def test_nested_records_filter_by_farm(self):
        crop = Crop.objects.create(
            farm=self.farm, crop_name="Maize", area_planted="1.00"
        )
        CropHealthObservation.objects.create(
            crop=crop, symptoms_observed="Leaf spots", severity="moderate"
        )
        CropActivity.objects.create(
            crop=crop, activity_type="weeding", description="Weeded rows"
        )
        other_crop = Crop.objects.create(
            farm=self.other_farm, crop_name="Rice", area_planted="1.00"
        )
        CropHealthObservation.objects.create(
            crop=other_crop, symptoms_observed="Other symptoms", severity="low"
        )
        CropActivity.objects.create(
            crop=other_crop, activity_type="irrigation", description="Other activity"
        )

        response = self.client.get(f"/api/v1/crop-health-records/?farm={self.farm.pk}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["crop"], crop.pk)

        response = self.client.get(f"/api/v1/crop-activities/?farm={self.farm.pk}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["crop"], crop.pk)

    def test_search_filter_and_pagination(self):
        Crop.objects.create(farm=self.farm, crop_name="Maize", area_planted="1.00")
        Crop.objects.create(farm=self.farm, crop_name="Beans", area_planted="1.00")

        response = self.client.get("/api/v1/crops/?search=maize&page_size=1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["crop_name"], "Maize")

        response = self.client.get("/api/v1/crops/?farm=invalid")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_crop_summary_uses_authorized_database_records(self):
        Crop.objects.create(
            farm=self.farm,
            crop_name="Maize",
            area_planted="1.00",
            growth_stage=self.stage,
            expected_harvest_date=timezone.localdate() + timedelta(days=10),
        )
        Crop.objects.create(
            farm=self.farm,
            crop_name="Beans",
            area_planted="0.50",
            status=Crop.Status.HARVESTED,
        )

        response = self.client.get(f"/api/v1/farms/{self.farm.pk}/crop-summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_crops"], 2)
        self.assertEqual(response.data["active_crops"], 1)
        self.assertEqual(response.data["approaching_harvest"], 1)
        self.assertEqual(response.data["growth_stage_distribution"][0]["count"], 1)

        response = self.client.get(f"/api/v1/farms/{self.other_farm.pk}/crop-summary/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_invalid_image_is_rejected(self):
        response = self.client.post(
            "/api/v1/crops/",
            self.crop_payload(image=SimpleUploadedFile("bad.txt", b"not an image")),
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_oversized_image_is_rejected(self):
        buffer = BytesIO()
        Image.new("RGB", (1, 1), color="blue").save(buffer, format="PNG")
        image_bytes = buffer.getvalue()
        image_bytes += b"\0" * (5 * 1024 * 1024 + 1 - len(image_bytes))
        response = self.client.post(
            "/api/v1/crops/",
            self.crop_payload(
                image=SimpleUploadedFile("large.png", image_bytes, content_type="image/png")
            ),
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_valid_image_is_private_and_owner_scoped(self):
        temporary_media = TemporaryDirectory()
        previous_location = private_media_storage._location
        private_media_storage._location = temporary_media.name
        private_media_storage.__dict__.pop("location", None)

        def cleanup_storage():
            private_media_storage._location = previous_location
            private_media_storage.__dict__.pop("location", None)
            temporary_media.cleanup()

        self.addCleanup(cleanup_storage)
        buffer = BytesIO()
        Image.new("RGB", (2, 2), color="green").save(buffer, format="PNG")
        image = SimpleUploadedFile("crop.png", buffer.getvalue(), content_type="image/png")
        response = self.client.post(
            "/api/v1/crops/",
            self.crop_payload(image=image),
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        image_url = response.data["image"]
        self.assertIn("/api/v1/private-images/crop/", image_url)

        response = self.client.get(image_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["X-Content-Type-Options"], "nosniff")
        self.assertTrue(b"".join(response.streaming_content))
        response.close()

        self.client.force_authenticate(self.other_farmer)
        response = self.client.get(image_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
