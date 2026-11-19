from io import BytesIO
from tempfile import TemporaryDirectory

from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth.models import Group
from PIL import Image
from django.test import Client, TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import User
from apps.common.storage import private_media_storage
from apps.farms.models import Farm, FarmPlot
from apps.reports.dashboard_forms import StaffAuthenticationForm
from apps.reports.models import (
    AgriculturalReport,
    CaseAssignment,
    ReportEvidence,
    ReportEvent,
    ReportUpdate,
)


class AgriculturalReportAPITests(APITestCase):
    def setUp(self):
        self.farmer = self.create_user("farmer@example.test", User.Role.FARMER)
        self.other_farmer = self.create_user("other@example.test", User.Role.FARMER)
        self.officer = self.create_user(
            "officer@example.test", User.Role.AGRICULTURAL_OFFICER
        )
        self.other_officer = self.create_user(
            "other-officer@example.test", User.Role.AGRICULTURAL_OFFICER
        )
        self.veterinarian = self.create_user(
            "vet@example.test", User.Role.VETERINARY_OFFICER
        )
        self.coordinator = self.create_user("coordinator@example.test", User.Role.STAFF)
        self.farm = Farm.objects.create(farmer=self.farmer, name="Nangina Farm", size="4.00")
        self.second_farm = Farm.objects.create(
            farmer=self.farmer, name="Bumala Farm", size="2.00"
        )
        self.plot = FarmPlot.objects.create(farm=self.farm, name="North plot", size="1.00")
        self.client.force_authenticate(self.farmer)

    def create_user(self, email, role):
        user = User.objects.create_user(
            email=email,
            password="Secure-test-pass-2026!",
            first_name="Test",
            last_name=role.replace("_", " ").title(),
            role=role,
        )
        if role == User.Role.STAFF:
            user.groups.add(Group.objects.get(name="Case Coordinators"))
        return user

    def report_payload(self, **overrides):
        payload = {
            "farm": self.farm.pk,
            "plot": self.plot.pk,
            "title": "Yellowing maize leaves",
            "description": "Several lower leaves are yellowing.",
            "category": AgriculturalReport.Category.CROP_HEALTH,
            "severity": AgriculturalReport.Severity.MODERATE,
        }
        payload.update(overrides)
        return payload

    def create_report(self, **overrides):
        response = self.client.post(
            "/api/v1/reports/", self.report_payload(**overrides), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return AgriculturalReport.objects.get(pk=response.data["id"])

    def assign(self, report, user=None, actor=None):
        self.client.force_authenticate(actor or self.coordinator)
        return self.client.post(
            f"/api/v1/staff/reports/{report.pk}/assignments/",
            {
                "assigned_user": (user or self.officer).pk,
                "reason": "Assigned for crop assessment.",
            },
            format="json",
        )

    def test_farmer_can_create_edit_and_list_only_owned_reports(self):
        response = self.client.post(
            "/api/v1/reports/", self.report_payload(), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        report = AgriculturalReport.objects.get(pk=response.data["id"])
        self.assertEqual(report.farmer, self.farmer)
        self.assertEqual(report.status, AgriculturalReport.Status.SUBMITTED)
        self.assertEqual(report.source, AgriculturalReport.Source.FARMER_APP)
        self.assertTrue(report.events.filter(event_type="submitted").exists())

        foreign = AgriculturalReport.objects.create(
            farmer=self.other_farmer,
            farm=Farm.objects.create(
                farmer=self.other_farmer, name="Foreign farm", size="1.00"
            ),
            title="Foreign case",
            description="Not visible.",
            category=AgriculturalReport.Category.OTHER,
        )
        response = self.client.get(f"/api/v1/reports/{foreign.pk}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self.client.patch(
            f"/api/v1/reports/{report.pk}/",
            {"title": "Updated title"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        report.refresh_from_db()
        self.assertEqual(report.title, "Updated title")

    def test_report_creation_validates_related_farm_and_category(self):
        other_plot = FarmPlot.objects.create(
            farm=self.second_farm, name="South plot", size="0.50"
        )
        response = self.client.post(
            "/api/v1/reports/",
            self.report_payload(plot=other_plot.pk),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("plot", response.data)

        response = self.client.post(
            "/api/v1/reports/",
            self.report_payload(
                category=AgriculturalReport.Category.LIVESTOCK_HEALTH,
                crop=1,
            ),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_farmer_endpoints_require_farmer_role_and_authentication(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/v1/reports/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(self.officer)
        response = self.client.get("/api/v1/reports/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_coordinator_assignment_is_category_scoped_and_staff_access_is_assignment_scoped(self):
        report = self.create_report()
        response = self.assign(report, user=self.veterinarian)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(CaseAssignment.objects.filter(report=report).exists())

        response = self.assign(report)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        report.refresh_from_db()
        self.assertEqual(report.status, AgriculturalReport.Status.ASSIGNED)

        self.client.force_authenticate(self.officer)
        response = self.client.get("/api/v1/staff/reports/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

        self.client.force_authenticate(self.other_officer)
        response = self.client.get(f"/api/v1/staff/reports/{report.pk}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_coordinator_transfer_closes_old_assignment_and_keeps_history(self):
        report = self.create_report()
        self.assertEqual(self.assign(report).status_code, status.HTTP_201_CREATED)
        response = self.client.post(
            f"/api/v1/staff/reports/{report.pk}/assignments/",
            {
                "assigned_user": self.other_officer.pk,
                "reason": "Transfer after officer handover.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        assignments = CaseAssignment.objects.filter(report=report)
        self.assertEqual(assignments.count(), 2)
        self.assertEqual(assignments.filter(is_active=True).count(), 1)
        self.assertEqual(
            assignments.get(assigned_user=self.officer).end_reason,
            "Transfer after officer handover.",
        )
        self.assertTrue(
            report.updates.filter(
                update_type=ReportUpdate.UpdateType.REASSIGNMENT_NOTE,
                visible_to_farmer=False,
            ).exists()
        )

    def test_unassigned_queue_requires_coordinator_and_supports_search(self):
        self.create_report()
        self.client.force_authenticate(self.officer)
        response = self.client.get("/api/v1/staff/reports/unassigned/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(self.coordinator)
        response = self.client.get(
            "/api/v1/staff/reports/unassigned/?search=Yellowing&category=crop_health"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

        response = self.client.get("/api/v1/staff/reports/unassigned/?severity=invalid")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_internal_updates_are_not_visible_to_farmer_and_workflow_can_reopen(self):
        report = self.create_report()
        self.assertEqual(self.assign(report).status_code, status.HTTP_201_CREATED)
        self.client.force_authenticate(self.officer)

        response = self.client.post(
            f"/api/v1/staff/reports/{report.pk}/updates/",
            {
                "update_type": ReportUpdate.UpdateType.INTERNAL_NOTE,
                "message": "Internal coordination note.",
                "visible_to_farmer": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertFalse(response.data["visible_to_farmer"])

        self.client.force_authenticate(self.farmer)
        response = self.client.get(f"/api/v1/reports/{report.pk}/updates/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

        self.client.force_authenticate(self.officer)
        response = self.client.post(
            f"/api/v1/staff/reports/{report.pk}/updates/",
            {
                "update_type": ReportUpdate.UpdateType.REQUEST_INFORMATION,
                "message": "Please provide a close-up photo.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        report.refresh_from_db()
        self.assertEqual(report.status, AgriculturalReport.Status.AWAITING_FARMER)

        self.client.force_authenticate(self.farmer)
        response = self.client.post(
            f"/api/v1/reports/{report.pk}/updates/",
            {"message": "The affected leaves are on the north plot."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)

        self.client.force_authenticate(self.officer)
        response = self.client.post(
            f"/api/v1/staff/reports/{report.pk}/updates/",
            {
                "update_type": ReportUpdate.UpdateType.RESOLUTION_SUMMARY,
                "message": "The case assessment is complete.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        report.refresh_from_db()
        self.assertEqual(report.status, AgriculturalReport.Status.RESOLVED)

        self.client.force_authenticate(self.coordinator)
        response = self.client.post(
            f"/api/v1/staff/reports/{report.pk}/transition/",
            {
                "new_status": AgriculturalReport.Status.CLOSED,
                "reason": "Farmer confirmed closure.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        response = self.client.post(
            f"/api/v1/staff/reports/{report.pk}/reopen/",
            {"reason": "New symptoms were reported."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        report.refresh_from_db()
        self.assertEqual(report.status, AgriculturalReport.Status.UNDER_REVIEW)

    def test_case_coordinator_can_reply_and_farmer_can_read_the_reply(self):
        report = self.create_report()
        self.client.force_authenticate(self.coordinator)

        response = self.client.post(
            f"/api/v1/staff/reports/{report.pk}/updates/",
            {
                "update_type": ReportUpdate.UpdateType.GENERAL,
                "message": "An agricultural officer will review your report.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertTrue(response.data["visible_to_farmer"])

        self.client.force_authenticate(self.farmer)
        response = self.client.get(f"/api/v1/reports/{report.pk}/updates/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["message"],
            "An agricultural officer will review your report.",
        )

    def test_report_evidence_image_validation_and_owner_or_assignee_access(self):
        temporary_media = TemporaryDirectory()
        previous_location = private_media_storage._location
        private_media_storage._location = temporary_media.name
        private_media_storage.__dict__.pop("location", None)

        def cleanup_storage():
            private_media_storage._location = previous_location
            private_media_storage.__dict__.pop("location", None)
            temporary_media.cleanup()

        self.addCleanup(cleanup_storage)
        report = self.create_report()
        invalid = self.client.post(
            f"/api/v1/reports/{report.pk}/evidence/",
            {
                "image": SimpleUploadedFile(
                    "not-an-image.txt", b"not an image", content_type="text/plain"
                )
            },
            format="multipart",
        )
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)

        buffer = BytesIO()
        Image.effect_noise((1800, 1800), 100).convert("RGB").save(
            buffer, format="JPEG", quality=100
        )
        oversized_image = SimpleUploadedFile(
            "large.jpg", buffer.getvalue(), content_type="image/jpeg"
        )
        response = self.client.post(
            f"/api/v1/reports/{report.pk}/evidence/",
            {"image": oversized_image},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        buffer = BytesIO()
        Image.new("RGB", (4, 4), color="green").save(buffer, format="PNG")
        response = self.client.post(
            f"/api/v1/reports/{report.pk}/evidence/",
            {
                "image": SimpleUploadedFile(
                    "field.png", buffer.getvalue(), content_type="image/png"
                ),
                "caption": "Affected leaves",
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        evidence = ReportEvidence.objects.get(pk=response.data["id"])
        image_url = response.data["image"]
        response = self.client.get(f"/api/v1/reports/{report.pk}/evidence/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertIn("/api/v1/private-images/report-evidence/", response.data["results"][0]["image"])

        self.client.force_authenticate(self.farmer)
        response = self.client.get(image_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(b"".join(response.streaming_content))
        response.close()

        self.client.force_authenticate(self.other_farmer)
        self.assertEqual(self.client.get(image_url).status_code, status.HTTP_404_NOT_FOUND)

        self.assertEqual(self.assign(report).status_code, status.HTTP_201_CREATED)
        self.client.force_authenticate(self.officer)
        response = self.client.get(image_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        response.close()

        self.client.force_authenticate(self.other_officer)
        self.assertEqual(self.client.get(image_url).status_code, status.HTTP_404_NOT_FOUND)
        self.assertIsNotNone(evidence.pk)


class StaffDashboardTests(TestCase):
    password = "Secure-test-pass-2026!"

    def setUp(self):
        self.farmer = self.create_user("dashboard-farmer@example.test", User.Role.FARMER)
        self.second_farmer = self.create_user(
            "dashboard-farmer-two@example.test", User.Role.FARMER
        )
        self.officer = self.create_user(
            "dashboard-officer@example.test", User.Role.AGRICULTURAL_OFFICER
        )
        self.other_officer = self.create_user(
            "dashboard-officer-two@example.test", User.Role.AGRICULTURAL_OFFICER
        )
        self.veterinarian = self.create_user(
            "dashboard-vet@example.test", User.Role.VETERINARY_OFFICER
        )
        self.coordinator = self.create_user(
            "dashboard-coordinator@example.test", User.Role.STAFF
        )
        self.farm = Farm.objects.create(
            farmer=self.farmer,
            name="Dashboard Farm",
            county="Busia",
            sub_county="Samia",
            ward="Nangina",
            village="Bumala",
            size="3.00",
        )
        self.second_farm = Farm.objects.create(
            farmer=self.second_farmer,
            name="Second Farm",
            size="1.00",
        )

    def create_user(self, email, role):
        user = User.objects.create_user(
            email=email,
            password=self.password,
            first_name="Dashboard",
            last_name=role.replace("_", " ").title(),
            role=role,
        )
        if role == User.Role.STAFF:
            user.groups.add(Group.objects.get(name="Case Coordinators"))
        return user

    def create_report(self, *, category=AgriculturalReport.Category.CROP_HEALTH, **overrides):
        data = {
            "farmer": self.farmer,
            "farm": self.farm,
            "title": "Yellowing maize leaves",
            "description": "Leaves on the north plot are turning yellow.",
            "category": category,
            "severity": AgriculturalReport.Severity.HIGH,
        }
        data.update(overrides)
        return AgriculturalReport.objects.create(**data)

    def assign(self, report, user=None, *, active=True):
        return CaseAssignment.objects.create(
            report=report,
            assigned_user=user or self.officer,
            assigned_by=self.coordinator,
            assignment_role=(user or self.officer).role,
            reason="Assigned for assessment.",
            is_active=active,
        )

    def test_staff_login_requires_authorized_role_and_dashboard_requires_authentication(self):
        response = self.client.get(reverse("staff:dashboard"))
        self.assertEqual(response.status_code, 302)
        self.assertIn(reverse("staff:login"), response.url)

        response = self.client.get(reverse("staff:login"))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "staff/login.html")
        response = self.client.post(
            reverse("staff:login"),
            {"username": self.officer.email, "password": self.password},
        )
        self.assertRedirects(response, reverse("staff:dashboard"))
        self.assertEqual(self.client.get(reverse("staff:dashboard")).status_code, 200)

        farmer_client = Client()
        response = farmer_client.post(
            reverse("staff:login"),
            {"username": self.farmer.email, "password": self.password},
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(farmer_client.session.get("_auth_user_id"))
        self.assertContains(response, "does not have staff dashboard access")

    def test_staff_login_rejects_inactive_account_status(self):
        self.officer.account_status = User.AccountStatus.PENDING
        self.officer.save(update_fields=["account_status", "updated_at"])

        form = StaffAuthenticationForm()
        with self.assertRaisesMessage(ValidationError, "This account is inactive."):
            form.confirm_login_allowed(self.officer)

    def test_officer_dashboard_and_case_details_are_limited_to_authorized_assignments(self):
        assigned = self.create_report()
        self.assign(assigned)
        wrong_category = self.create_report(
            category=AgriculturalReport.Category.LIVESTOCK_HEALTH,
            title="Livestock case",
        )
        self.assign(wrong_category)
        another_officers_case = self.create_report(
            title="Another officer case",
            farm=Farm.objects.create(
                farmer=self.second_farmer, name="Other farmer farm", size="1.00"
            ),
            farmer=self.second_farmer,
        )
        self.assign(another_officers_case, self.other_officer)

        self.client.force_login(self.officer)
        response = self.client.get(reverse("staff:dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context["assigned_count"], 1)
        self.assertEqual(response.context["awaiting_review_count"], 1)

        response = self.client.get(reverse("staff:cases"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context["page_obj"].paginator.count, 1)
        self.assertContains(response, assigned.report_reference)
        self.assertNotContains(response, wrong_category.report_reference)

        response = self.client.get(
            reverse("staff:case-detail", kwargs={"report_id": assigned.pk})
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "Farmer report")
        self.assertContains(response, assigned.description)

        response = self.client.get(
            reverse("staff:case-detail", kwargs={"report_id": another_officers_case.pk})
        )
        self.assertEqual(response.status_code, 404)
        response = self.client.get(
            reverse("staff:case-detail", kwargs={"report_id": wrong_category.pk})
        )
        self.assertEqual(response.status_code, 404)

        api_client = APIClient()
        api_client.force_authenticate(self.officer)
        response = api_client.get("/api/v1/staff/reports/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)

    def test_coordinator_queue_and_category_scoped_assignment(self):
        report = self.create_report()
        self.create_report(title="Already assigned").assignments.create(
            assigned_user=self.officer,
            assigned_by=self.coordinator,
            assignment_role=self.officer.role,
            reason="Existing active case.",
        )

        self.client.force_login(self.coordinator)
        response = self.client.get(reverse("staff:dashboard"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context["unassigned_count"], 1)

        response = self.client.get(reverse("staff:unassigned"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context["page_obj"].paginator.count, 1)
        self.assertContains(response, report.report_reference)

        response = self.client.get(
            reverse("staff:case-assignments", kwargs={"report_id": report.pk})
        )
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, self.officer.email)
        self.assertNotContains(response, self.veterinarian.email)

        response = self.client.post(
            reverse("staff:case-assignments", kwargs={"report_id": report.pk}),
            {
                "assigned_user": self.veterinarian.pk,
                "reason": "Attempted incompatible assignment.",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertFalse(report.assignments.filter(is_active=True).exists())

        response = self.client.post(
            reverse("staff:case-assignments", kwargs={"report_id": report.pk}),
            {
                "assigned_user": self.officer.pk,
                "reason": "Assigned for crop assessment.",
            },
        )
        self.assertRedirects(
            response,
            reverse("staff:case-assignments", kwargs={"report_id": report.pk}),
        )
        self.assertTrue(report.assignments.filter(is_active=True).exists())
        self.assertTrue(
            report.events.filter(event_type=ReportEvent.EventType.ASSIGNED).exists()
        )

        self.client.force_login(self.officer)
        self.assertEqual(self.client.get(reverse("staff:unassigned")).status_code, 403)
        self.assertEqual(self.client.get(reverse("staff:officers")).status_code, 403)

    def test_case_updates_use_workflow_service_and_hide_internal_notes_from_farmer(self):
        report = self.create_report(status=AgriculturalReport.Status.IN_PROGRESS)
        self.assign(report)
        self.client.force_login(self.officer)

        update_url = reverse("staff:case-update", kwargs={"report_id": report.pk})
        response = self.client.post(
            update_url,
            {
                "update_type": ReportUpdate.UpdateType.INTERNAL_NOTE,
                "message": "Do not show this to the farmer.",
                "visible_to_farmer": "on",
            },
        )
        self.assertRedirects(
            response, reverse("staff:case-detail", kwargs={"report_id": report.pk})
        )
        internal = report.updates.get(update_type=ReportUpdate.UpdateType.INTERNAL_NOTE)
        self.assertFalse(internal.visible_to_farmer)

        response = self.client.post(
            update_url,
            {
                "update_type": ReportUpdate.UpdateType.RECOMMENDATION,
                "message": "Review crop spacing during the next visit.",
                "visible_to_farmer": "on",
            },
        )
        self.assertEqual(response.status_code, 302)
        public_update = report.updates.get(
            update_type=ReportUpdate.UpdateType.RECOMMENDATION
        )
        self.assertTrue(public_update.visible_to_farmer)

        self.client.force_login(self.farmer)
        api_client = APIClient()
        api_client.force_authenticate(self.farmer)
        response = api_client.get(f"/api/v1/reports/{report.pk}/updates/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["message"], public_update.message)

        self.client.force_login(self.officer)
        response = self.client.get(
            reverse("staff:case-detail", kwargs={"report_id": report.pk})
        )
        self.assertContains(response, "Do not show this to the farmer.")
        self.assertContains(response, "Internal only")

    def test_coordinator_can_reply_from_the_case_dashboard(self):
        report = self.create_report()
        self.client.force_login(self.coordinator)

        detail_response = self.client.get(
            reverse("staff:case-detail", kwargs={"report_id": report.pk})
        )
        self.assertEqual(detail_response.status_code, 200)
        self.assertContains(detail_response, "Add case update")
        self.assertNotContains(detail_response, "Attach an image")

        response = self.client.post(
            reverse("staff:case-update", kwargs={"report_id": report.pk}),
            {
                "update_type": ReportUpdate.UpdateType.GENERAL,
                "message": "We received your report and will follow up.",
                "visible_to_farmer": "on",
            },
        )
        self.assertRedirects(
            response, reverse("staff:case-detail", kwargs={"report_id": report.pk})
        )
        update = report.updates.get(update_type=ReportUpdate.UpdateType.GENERAL)
        self.assertTrue(update.visible_to_farmer)
        self.assertEqual(update.author, self.coordinator)

    def test_coordinator_can_close_and_reopen_using_existing_workflow(self):
        report = self.create_report(status=AgriculturalReport.Status.RESOLVED)
        self.assign(report)
        self.client.force_login(self.coordinator)

        response = self.client.post(
            reverse("staff:case-transition", kwargs={"report_id": report.pk}),
            {
                "new_status": AgriculturalReport.Status.CLOSED,
                "reason": "Case closure confirmed.",
            },
        )
        self.assertRedirects(
            response, reverse("staff:case-detail", kwargs={"report_id": report.pk})
        )
        report.refresh_from_db()
        self.assertEqual(report.status, AgriculturalReport.Status.CLOSED)
        self.assertFalse(report.assignments.filter(is_active=True).exists())

        response = self.client.post(
            reverse("staff:case-reopen", kwargs={"report_id": report.pk}),
            {"reason": "The farmer reported new symptoms."},
        )
        self.assertEqual(response.status_code, 302)
        report.refresh_from_db()
        self.assertEqual(report.status, AgriculturalReport.Status.UNDER_REVIEW)
        self.assertTrue(
            report.events.filter(event_type=ReportEvent.EventType.REOPENED).exists()
        )

    def test_dashboard_forms_are_csrf_protected_and_private_evidence_stays_scoped(self):
        report = self.create_report()
        self.assign(report)
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
        Image.new("RGB", (4, 4), color="blue").save(buffer, format="PNG")
        evidence = ReportEvidence.objects.create(
            report=report,
            image=SimpleUploadedFile(
                "case.png", buffer.getvalue(), content_type="image/png"
            ),
            uploaded_by=self.farmer,
        )

        csrf_client = Client(enforce_csrf_checks=True)
        csrf_client.force_login(self.officer)
        csrf_client.get(reverse("staff:case-detail", kwargs={"report_id": report.pk}))
        response = csrf_client.post(
            reverse("staff:case-update", kwargs={"report_id": report.pk}),
            {
                "update_type": ReportUpdate.UpdateType.SITE_VISIT,
                "message": "Visited the farm.",
            },
        )
        self.assertEqual(response.status_code, 403)

        secure_client = Client()
        secure_client.force_login(self.officer)
        image_url = reverse(
            "private-image",
            kwargs={"resource": "report-evidence", "pk": evidence.pk},
        )
        response = secure_client.get(image_url)
        self.assertEqual(response.status_code, 200)
        response.close()

        secure_client.force_login(self.other_officer)
        self.assertEqual(secure_client.get(image_url).status_code, 404)

        farmer_client = Client(enforce_csrf_checks=True)
        login_page = farmer_client.get(reverse("staff:login"))
        self.assertEqual(login_page.status_code, 200)
        response = farmer_client.post(
            reverse("staff:login"),
            {"username": self.officer.email, "password": self.password},
        )
        self.assertEqual(response.status_code, 403)
