from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.crops.models import Crop, CropHealthObservation
from apps.farms.models import Farm
from apps.notifications.models import Notification
from apps.reports.models import AgriculturalReport, ReportEvent, ReportUpdate


class NotificationAPITests(APITestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            email="farmer@example.test",
            password="Secure-test-pass-2026!",
            first_name="Farm",
            last_name="Owner",
        )
        self.other_farmer = User.objects.create_user(
            email="other@example.test",
            password="Secure-test-pass-2026!",
            first_name="Other",
            last_name="Farmer",
        )
        self.handler = User.objects.create_user(
            email="handler@example.test",
            password="Secure-test-pass-2026!",
            first_name="Field",
            last_name="Officer",
            role=User.Role.AGRICULTURAL_OFFICER,
        )
        self.coordinator = User.objects.create_superuser(
            email="admin@example.test",
            password="Secure-test-pass-2026!",
            first_name="Case",
            last_name="Coordinator",
        )
        self.farm = Farm.objects.create(
            farmer=self.farmer,
            name="Main farm",
            size="2.00",
        )
        self.other_farm = Farm.objects.create(
            farmer=self.other_farmer,
            name="Other farm",
            size="1.00",
        )
        self.client.force_authenticate(self.farmer)

    def create_notification(self, recipient, event_key):
        return Notification.objects.create(
            recipient=recipient,
            event_key=event_key,
            notification_type=Notification.Type.REPORT,
            title="Case update",
            message="A case has an update.",
            action_url="/report-problem",
        )

    def create_report(self):
        return AgriculturalReport.objects.create(
            farmer=self.farmer,
            farm=self.farm,
            title="Yellowing maize leaves",
            description="Several lower leaves are yellowing.",
            category=AgriculturalReport.Category.CROP_HEALTH,
            severity=AgriculturalReport.Severity.MODERATE,
        )

    def test_notifications_are_isolated_and_read_state_persists(self):
        own_notification = self.create_notification(self.farmer, "own-event")
        self.create_notification(self.other_farmer, "other-event")
        second_notification = self.create_notification(self.farmer, "second-event")

        response = self.client.get("/api/v1/notifications/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(
            {item["id"] for item in response.data["results"]},
            {own_notification.pk, second_notification.pk},
        )

        response = self.client.post(
            f"/api/v1/notifications/{own_notification.pk}/read/"
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["is_read"])

        response = self.client.post(
            f"/api/v1/notifications/{Notification.objects.get(event_key='other-event').pk}/read/"
        )
        self.assertEqual(response.status_code, 404)

        response = self.client.post("/api/v1/notifications/read-all/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["updated_count"], 1)
        own_notification.refresh_from_db()
        second_notification.refresh_from_db()
        self.assertTrue(own_notification.is_read)
        self.assertTrue(second_notification.is_read)

    def test_farm_health_alerts_are_persisted_once_per_farmer(self):
        crop = Crop.objects.create(
            farm=self.farm,
            crop_name="Maize",
            area_planted="1.00",
        )
        other_crop = Crop.objects.create(
            farm=self.other_farm,
            crop_name="Beans",
            area_planted="0.50",
        )
        observation = CropHealthObservation.objects.create(
            crop=crop,
            symptoms_observed="Leaves show severe discoloration.",
            severity=CropHealthObservation.Severity.HIGH,
        )
        CropHealthObservation.objects.create(
            crop=other_crop,
            symptoms_observed="Foreign farm observation.",
            severity=CropHealthObservation.Severity.CRITICAL,
        )

        first_response = self.client.get("/api/v1/notifications/")
        second_response = self.client.get("/api/v1/notifications/")

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        self.assertEqual(first_response.data["count"], 1)
        self.assertEqual(second_response.data["count"], 1)
        self.assertEqual(
            first_response.data["results"][0]["message"],
            "Leaves show severe discoloration.",
        )

        observation.severity = CropHealthObservation.Severity.LOW
        observation.save(update_fields=["severity"])
        response = self.client.get("/api/v1/notifications/")
        self.assertEqual(response.data["count"], 0)

    def test_closed_reports_are_removed_from_open_report_alerts(self):
        report = self.create_report()
        self.client.get("/api/v1/notifications/")
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.farmer,
                event_key=f"open-report:{report.pk}",
            ).exists()
        )

        report.status = AgriculturalReport.Status.RESOLVED
        report.save(update_fields=["status"])
        self.client.get("/api/v1/notifications/")

        self.assertFalse(
            Notification.objects.filter(
                recipient=self.farmer,
                event_key=f"open-report:{report.pk}",
            ).exists()
        )

    def test_report_events_notify_the_appropriate_users(self):
        report = self.create_report()
        submitted = ReportEvent.objects.create(
            report=report,
            actor=self.farmer,
            event_type=ReportEvent.EventType.SUBMITTED,
            details={"status": report.status},
        )
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.coordinator,
                event_key=f"report-event:{submitted.pk}:coordinator:{self.coordinator.pk}",
            ).exists()
        )

        assigned = ReportEvent.objects.create(
            report=report,
            actor=self.coordinator,
            event_type=ReportEvent.EventType.ASSIGNED,
            details={"assigned_user_id": self.handler.pk},
        )
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.handler,
                event_key=f"report-event:{assigned.pk}:handler:{self.handler.pk}",
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.farmer,
                event_key=f"report-event:{assigned.pk}:farmer",
            ).exists()
        )

        public_update = ReportUpdate.objects.create(
            report=report,
            author=self.handler,
            update_type=ReportUpdate.UpdateType.GENERAL,
            message="An officer is reviewing your report.",
            visible_to_farmer=True,
        )
        public_event = ReportEvent.objects.create(
            report=report,
            actor=self.handler,
            event_type=ReportEvent.EventType.UPDATE_CREATED,
            details={"update_id": public_update.pk},
        )
        self.assertTrue(
            Notification.objects.filter(
                recipient=self.farmer,
                event_key=f"report-event:{public_event.pk}:farmer",
                message=public_update.message,
            ).exists()
        )

        private_update = ReportUpdate.objects.create(
            report=report,
            author=self.handler,
            update_type=ReportUpdate.UpdateType.INTERNAL_NOTE,
            message="Internal note.",
            visible_to_farmer=False,
        )
        private_event = ReportEvent.objects.create(
            report=report,
            actor=self.handler,
            event_type=ReportEvent.EventType.UPDATE_CREATED,
            details={"update_id": private_update.pk},
        )
        self.assertFalse(
            Notification.objects.filter(
                recipient=self.farmer,
                event_key=f"report-event:{private_event.pk}:farmer",
            ).exists()
        )

    def test_staff_notifications_page_and_read_action_are_access_controlled(self):
        notification = self.create_notification(self.handler, "staff-event")

        self.client.force_login(self.handler)
        response = self.client.get("/staff/notifications/")
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Case update")

        response = self.client.post(
            f"/staff/notifications/{notification.pk}/read/"
        )
        self.assertEqual(response.status_code, 302)
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)

        self.client.force_login(self.farmer)
        response = self.client.get("/staff/notifications/")
        self.assertEqual(response.status_code, 403)
