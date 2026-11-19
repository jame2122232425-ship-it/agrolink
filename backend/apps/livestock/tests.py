from io import BytesIO
from tempfile import TemporaryDirectory

from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import FarmerProfile, User
from apps.common.storage import private_media_storage
from apps.farms.models import Farm
from apps.livestock.models import (
    Animal,
    LivestockActivity,
    LivestockGroup,
    LivestockHealthObservation,
    LivestockMedicalRecord,
)


class LivestockAPITests(APITestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            email="livestock-farmer@example.test",
            password="Secure-test-pass-2026!",
            first_name="Livestock",
            last_name="Farmer",
        )
        FarmerProfile.objects.create(user=self.farmer)
        self.other_farmer = User.objects.create_user(
            email="other-livestock@example.test",
            password="Secure-test-pass-2026!",
            first_name="Other",
            last_name="Farmer",
        )
        self.farm = Farm.objects.create(farmer=self.farmer, name="Samia Farm", size="5.00")
        self.other_farm = Farm.objects.create(
            farmer=self.other_farmer, name="Other Farm", size="2.00"
        )
        self.group = LivestockGroup.objects.create(
            farm=self.farm,
            species="dairy cattle",
            breed="Friesian",
            group_name="Dairy herd",
            animal_count=3,
        )
        self.client.force_authenticate(self.farmer)

    def group_payload(self, **overrides):
        payload = {
            "farm": self.farm.pk,
            "species": "goats",
            "breed": "Galla",
            "group_name": "Doe group",
            "animal_count": 4,
            "production_purpose": "milk",
        }
        payload.update(overrides)
        return payload

    def animal_payload(self, **overrides):
        payload = {
            "farm": self.farm.pk,
            "group": self.group.pk,
            "identification_number": "cow-001",
            "name_or_tag": "Akinyi",
            "species": "dairy cattle",
            "breed": "Friesian",
            "sex": "female",
            "estimated_age_months": 30,
            "production_purpose": "dairy",
        }
        payload.update(overrides)
        return payload

    def test_group_creation_and_nonnegative_count_validation(self):
        response = self.client.post(
            "/api/v1/livestock/groups/", self.group_payload(), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        group = LivestockGroup.objects.get(pk=response.data["id"])
        self.assertEqual(group.farm, self.farm)
        self.assertEqual(group.animal_count, 4)

        response = self.client.post(
            "/api/v1/livestock/groups/",
            self.group_payload(animal_count=-1),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_animal_creation_and_identification_uniqueness(self):
        response = self.client.post(
            "/api/v1/livestock/animals/", self.animal_payload(), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        animal = Animal.objects.get(pk=response.data["id"])
        self.assertEqual(animal.group, self.group)

        response = self.client.post(
            "/api/v1/livestock/animals/",
            self.animal_payload(identification_number="COW-001"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_animal_historical_details_are_optional_and_group_must_match_farm(self):
        response = self.client.post(
            "/api/v1/livestock/animals/",
            self.animal_payload(
                identification_number="",
                name_or_tag="",
                group=None,
                birth_date=None,
                estimated_age_months=None,
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        foreign_group = LivestockGroup.objects.create(
            farm=self.other_farm,
            species="dairy cattle",
            group_name="Foreign herd",
        )
        response = self.client.post(
            "/api/v1/livestock/animals/",
            self.animal_payload(group=foreign_group.pk, identification_number="cow-002"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_animal_health_observation_activity_and_medical_history(self):
        animal = Animal.objects.create(
            farm=self.farm,
            group=self.group,
            species="dairy cattle",
            identification_number="cow-01",
            name_or_tag="Nekesa",
        )
        response = self.client.post(
            f"/api/v1/livestock/animals/{animal.pk}/health-records/",
            {"symptoms_reported": "Reduced appetite", "severity": "moderate"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        observation = LivestockHealthObservation.objects.get(pk=response.data["id"])
        self.assertEqual(observation.animal, animal)
        self.assertEqual(observation.recorded_by, self.farmer)

        response = self.client.post(
            f"/api/v1/livestock/animals/{animal.pk}/activities/",
            {
                "activity_type": "milking",
                "description": "Morning milking",
                "quantity": "8.5",
                "unit": "litres",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(LivestockActivity.objects.get(pk=response.data["id"]).animal, animal)

        response = self.client.post(
            f"/api/v1/livestock/animals/{animal.pk}/medical-records/",
            {
                "record_type": "vaccination",
                "product_or_vaccine": "Historical vaccination",
                "administration_date": "2026-01-15",
                "next_scheduled_date": "2027-01-15",
                "entry_type": "professional",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        medical_record = LivestockMedicalRecord.objects.get(pk=response.data["id"])
        self.assertEqual(medical_record.entry_type, LivestockMedicalRecord.EntryType.FARMER_REPORTED)
        self.assertEqual(medical_record.recorded_by, self.farmer)

        response = self.client.post(
            f"/api/v1/livestock/animals/{animal.pk}/medical-records/",
            {
                "record_type": "treatment",
                "product_or_vaccine": "Farmer-entered historical treatment",
                "administration_date": "2026-02-01",
                "dosage": "2.5",
                "dosage_unit": "ml",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["record_type"], "treatment")

    def test_group_health_records_and_activity_history(self):
        response = self.client.post(
            f"/api/v1/livestock/groups/{self.group.pk}/health-records/",
            {"symptoms_reported": "Several animals coughing", "severity": "high"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            LivestockHealthObservation.objects.get(pk=response.data["id"]).group, self.group
        )

        response = self.client.post(
            f"/api/v1/livestock/groups/{self.group.pk}/activities/",
            {"activity_type": "feeding", "description": "Morning feed"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(LivestockActivity.objects.get(pk=response.data["id"]).group, self.group)

    def test_cross_farmer_records_are_not_visible(self):
        foreign_group = LivestockGroup.objects.create(
            farm=self.other_farm,
            species="poultry",
            group_name="Foreign flock",
        )
        response = self.client.get(f"/api/v1/livestock/groups/{foreign_group.pk}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self.client.post(
            "/api/v1/livestock/groups/",
            self.group_payload(farm=self.other_farm.pk),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.get("/api/v1/livestock/groups/?farm=invalid")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_search_filter_and_pagination(self):
        LivestockGroup.objects.create(
            farm=self.farm,
            species="poultry",
            group_name="Kuroiler flock",
        )

        response = self.client.get("/api/v1/livestock/groups/?search=kuroiler&page_size=1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["group_name"], "Kuroiler flock")

    def test_livestock_images_use_private_owner_scoped_route(self):
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
        Image.new("RGB", (2, 2), color="brown").save(buffer, format="PNG")
        response = self.client.post(
            "/api/v1/livestock/groups/",
            self.group_payload(
                image=SimpleUploadedFile(
                    "herd.png", buffer.getvalue(), content_type="image/png"
                )
            ),
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        image_url = response.data["image"]
        response = self.client.get(image_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(b"".join(response.streaming_content))
        response.close()

        self.client.force_authenticate(self.other_farmer)
        response = self.client.get(image_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_livestock_summary_counts_groups_and_unassigned_individuals_once(self):
        Animal.objects.create(
            farm=self.farm,
            group=self.group,
            species="dairy cattle",
            identification_number="cow-03",
            status=Animal.Status.ACTIVE,
        )
        Animal.objects.create(
            farm=self.farm,
            group=None,
            species="goats",
            identification_number="goat-01",
            status=Animal.Status.ACTIVE,
        )
        goat_group = LivestockGroup.objects.create(
            farm=self.farm,
            species="goats",
            group_name="Goat group",
            animal_count=4,
        )
        LivestockMedicalRecord.objects.create(
            group=goat_group,
            record_type=LivestockMedicalRecord.RecordType.VACCINATION,
            product_or_vaccine="Recorded vaccine follow-up",
            administration_date=timezone.localdate(),
            next_scheduled_date=timezone.localdate() + timedelta(days=20),
        )

        response = self.client.get(f"/api/v1/farms/{self.farm.pk}/livestock-summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_animals"], 8)
        self.assertEqual(response.data["active_livestock_groups"], 2)
        self.assertEqual(len(response.data["upcoming_health_activities"]), 1)

        response = self.client.get(f"/api/v1/farms/{self.other_farm.pk}/livestock-summary/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_farmer_role_cannot_access_livestock_endpoints(self):
        officer = User.objects.create_user(
            email="vet@example.test",
            password="Secure-test-pass-2026!",
            first_name="Vet",
            last_name="Officer",
            role=User.Role.VETERINARY_OFFICER,
        )
        self.client.force_authenticate(officer)
        response = self.client.get("/api/v1/livestock/groups/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
