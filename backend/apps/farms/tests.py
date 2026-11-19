from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import FarmerProfile, User
from apps.crops.models import Crop, CropActivity
from apps.farms.models import Farm, FarmNote, FarmPlot
from apps.livestock.models import LivestockActivity, LivestockGroup, LivestockMedicalRecord
from apps.reports.models import AgriculturalReport


class FarmAPITests(APITestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            email="farmer@example.test",
            password="Secure-test-pass-2026!",
            first_name="Farmer",
            last_name="One",
        )
        FarmerProfile.objects.create(user=self.farmer)
        self.other_farmer = User.objects.create_user(
            email="other@example.test",
            password="Secure-test-pass-2026!",
            first_name="Farmer",
            last_name="Two",
        )
        self.farm = Farm.objects.create(
            farmer=self.farmer,
            name="Green Valley",
            size="3.50",
            size_unit=Farm.SizeUnit.ACRES,
            farming_type=Farm.FarmingType.MIXED,
            county="Busia",
        )

    def test_unauthenticated_farm_access_is_rejected(self):
        response = self.client.get("/api/v1/farms/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_farmer_role_cannot_use_farmer_endpoints(self):
        officer = User.objects.create_user(
            email="officer@example.test",
            password="Secure-test-pass-2026!",
            first_name="Extension",
            last_name="Officer",
            role=User.Role.AGRICULTURAL_OFFICER,
        )
        self.client.force_authenticate(officer)

        response = self.client.get("/api/v1/farms/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_farmer_can_create_farm_and_cannot_assign_ownership(self):
        self.client.force_authenticate(self.farmer)
        response = self.client.post(
            "/api/v1/farms/",
            {
                "name": "New Farm",
                "size": "2.00",
                "size_unit": "acres",
                "farming_type": "crops",
                "farmer": self.other_farmer.pk,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        new_farm = Farm.objects.get(name="New Farm")
        self.assertEqual(new_farm.farmer, self.farmer)

    def test_farmer_cannot_read_or_modify_another_farm(self):
        other_farm = Farm.objects.create(
            farmer=self.other_farmer,
            name="Private Farm",
            size="1.00",
        )
        self.client.force_authenticate(self.farmer)

        response = self.client.get(f"/api/v1/farms/{other_farm.pk}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self.client.patch(
            f"/api/v1/farms/{other_farm.pk}/", {"name": "Changed"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        other_farm.refresh_from_db()
        self.assertEqual(other_farm.name, "Private Farm")

    def test_farm_input_validation_rejects_non_positive_size(self):
        self.client.force_authenticate(self.farmer)
        response = self.client.post(
            "/api/v1/farms/",
            {"name": "Invalid Farm", "size": "0", "size_unit": "acres"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Farm.objects.filter(name="Invalid Farm").exists())

    def test_plot_endpoints_are_scoped_to_owned_farm(self):
        self.client.force_authenticate(self.farmer)
        response = self.client.post(
            f"/api/v1/farms/{self.farm.pk}/plots/",
            {"name": "North Plot", "size": "1.25", "soil_type": "loam"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        plot = FarmPlot.objects.get(name="North Plot")
        self.assertEqual(plot.farm, self.farm)

        foreign_farm = Farm.objects.create(
            farmer=self.other_farmer,
            name="Other Farm",
            size="2.00",
        )
        response = self.client.get(f"/api/v1/farms/{foreign_farm.pk}/plots/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_plot_soil_ph_is_stored_validated_and_returned(self):
        self.client.force_authenticate(self.farmer)
        response = self.client.post(
            f"/api/v1/farms/{self.farm.pk}/plots/",
            {"name": "pH Plot", "size": "1.00", "soil_type": "loam", "soil_ph": "6.4"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["soil_ph"], "6.4")
        self.assertEqual(str(FarmPlot.objects.get(name="pH Plot").soil_ph), "6.4")

        response = self.client.post(
            f"/api/v1/farms/{self.farm.pk}/plots/",
            {"name": "Bad pH Plot", "size": "1.00", "soil_ph": "20.0"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(FarmPlot.objects.filter(name="Bad pH Plot").exists())


class FarmActivityFeedTests(APITestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            email="feed-farmer@example.test",
            password="Secure-test-pass-2026!",
            first_name="Feed",
            last_name="Farmer",
        )
        FarmerProfile.objects.create(user=self.farmer)
        self.other_farmer = User.objects.create_user(
            email="feed-other@example.test",
            password="Secure-test-pass-2026!",
            first_name="Other",
            last_name="Farmer",
        )
        self.farm = Farm.objects.create(farmer=self.farmer, name="Feed Farm", size="3.00")
        self.plot = FarmPlot.objects.create(farm=self.farm, name="Feed Plot", size="1.00")
        self.client.force_authenticate(self.farmer)

    def test_feed_merges_crop_livestock_and_report_events(self):
        crop = Crop.objects.create(
            farm=self.farm, plot=self.plot, crop_name="Maize", area_planted="1.00"
        )
        CropActivity.objects.create(
            crop=crop, activity_type="weeding", description="Weeded the rows"
        )
        group = LivestockGroup.objects.create(
            farm=self.farm, species="Cattle", group_name="Dairy cows", animal_count=3
        )
        LivestockActivity.objects.create(
            group=group, activity_type="milking", description="Morning milking"
        )
        LivestockMedicalRecord.objects.create(
            group=group, record_type="vaccination", product_or_vaccine="FMD"
        )
        AgriculturalReport.objects.create(
            farmer=self.farmer,
            farm=self.farm,
            title="Maize wilt",
            description="Leaves are wilting",
            category="crop_health",
            severity="high",
        )

        response = self.client.get(f"/api/v1/farms/{self.farm.pk}/activity-feed/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["farm"], self.farm.pk)
        sources = {item["source"] for item in response.data["results"]}
        self.assertEqual(
            sources,
            {"crop_activity", "livestock_activity", "livestock_medical", "report"},
        )
        crop_item = next(
            item
            for item in response.data["results"]
            if item["source"] == "crop_activity"
        )
        self.assertEqual(crop_item["category"], "crop")
        self.assertEqual(crop_item["subject"], "Maize")
        self.assertEqual(crop_item["location"], "Feed Plot")

    def test_feed_is_scoped_to_owned_farm(self):
        other_farm = Farm.objects.create(
            farmer=self.other_farmer, name="Private Feed Farm", size="1.00"
        )

        response = self.client.get(f"/api/v1/farms/{other_farm.pk}/activity-feed/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_feed_rejects_invalid_limit(self):
        response = self.client.get(
            f"/api/v1/farms/{self.farm.pk}/activity-feed/?limit=abc"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class FarmNoteAPITests(APITestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            email="note-farmer@example.test",
            password="Secure-test-pass-2026!",
            first_name="Note",
            last_name="Farmer",
        )
        FarmerProfile.objects.create(user=self.farmer)
        self.other_farmer = User.objects.create_user(
            email="note-other@example.test",
            password="Secure-test-pass-2026!",
            first_name="Other",
            last_name="Farmer",
        )
        self.farm = Farm.objects.create(farmer=self.farmer, name="Note Farm", size="2.00")
        self.client.force_authenticate(self.farmer)

    def test_farmer_can_create_and_list_farm_notes(self):
        response = self.client.post(
            f"/api/v1/farms/{self.farm.pk}/notes/",
            {
                "title": "Top-dressed CAN",
                "detail": "Applied 50kg per acre",
                "category": "crop",
                "note_date": "2026-05-01",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        note = FarmNote.objects.get(pk=response.data["id"])
        self.assertEqual(note.farm, self.farm)
        self.assertEqual(note.author, self.farmer)

        listed = self.client.get(f"/api/v1/farms/{self.farm.pk}/notes/")
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listed.data), 1)
        self.assertEqual(listed.data[0]["title"], "Top-dressed CAN")

    def test_notes_are_scoped_to_owned_farm(self):
        other_farm = Farm.objects.create(
            farmer=self.other_farmer, name="Private Note Farm", size="1.00"
        )

        response = self.client.get(f"/api/v1/farms/{other_farm.pk}/notes/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self.client.post(
            f"/api/v1/farms/{other_farm.pk}/notes/",
            {"title": "Should fail"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(FarmNote.objects.exists())

    def test_farmer_can_delete_own_note_only(self):
        note = FarmNote.objects.create(farm=self.farm, author=self.farmer, title="Weeding")

        response = self.client.delete(f"/api/v1/farms/{self.farm.pk}/notes/{note.pk}/")
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(FarmNote.objects.filter(pk=note.pk).exists())

    def test_farm_notes_appear_in_activity_feed(self):
        FarmNote.objects.create(
            farm=self.farm,
            author=self.farmer,
            title="Soil test collected",
            category="soil",
            note_date="2026-05-02",
        )

        response = self.client.get(f"/api/v1/farms/{self.farm.pk}/activity-feed/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        note_items = [
            item for item in response.data["results"] if item["source"] == "farm_note"
        ]
        self.assertEqual(len(note_items), 1)
        self.assertEqual(note_items[0]["title"], "Soil test collected")
        self.assertEqual(note_items[0]["category"], "soil")
        self.assertEqual(note_items[0]["subject"], "Soil")


class HealthAPITests(APITestCase):
    def test_health_is_public_and_returns_service_status(self):
        response = self.client.get("/api/v1/health/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")
        self.assertEqual(response.data["service"], "agrolink-api")

    def test_health_alias_is_public_and_returns_service_status(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")
