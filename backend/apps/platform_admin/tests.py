from django.contrib.auth.models import Group
from django.core import mail
from django.core.exceptions import ValidationError
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import Client, TestCase, TransactionTestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import FarmerProfile, Role, User
from apps.accounts.permissions import PLATFORM_STAFF_PERMISSIONS
from apps.crops.models import Crop, CropGrowthStage
from apps.farms.models import Farm, FarmPlot
from apps.livestock.models import Animal, LivestockGroup
from apps.platform_admin.models import AdminAuditEvent
from apps.platform_admin.services import (
    change_account_status,
    create_role,
)
from apps.reports.models import AgriculturalReport


class PlatformAdministrationTests(TestCase):
    password = "Secure-test-pass-2026!"

    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="admin@example.test",
            password=self.password,
            first_name="Platform",
            last_name="Admin",
        )
        self.farmer = User.objects.create_user(
            email="farmer@example.test",
            password=self.password,
            first_name="Amina",
            last_name="Farmer",
            role=User.Role.FARMER,
        )
        FarmerProfile.objects.create(user=self.farmer, county="Busia", sub_county="Samia")
        self.professional = User.objects.create_user(
            email="officer@example.test",
            password=self.password,
            first_name="Peter",
            last_name="Officer",
            role=User.Role.AGRICULTURAL_OFFICER,
        )
        self.farm = Farm.objects.create(
            farmer=self.farmer,
            name="Nangina Farm",
            county="Busia",
            sub_county="Samia",
            size="2.00",
        )
        self.plot = FarmPlot.objects.create(
            farm=self.farm,
            name="North plot",
            size="1.00",
        )
        self.crop = Crop.objects.create(
            farm=self.farm,
            plot=self.plot,
            crop_name="Maize",
            area_planted="0.50",
        )
        self.group = LivestockGroup.objects.create(
            farm=self.farm,
            species="Cattle",
            group_name="Dairy cows",
            animal_count=2,
        )
        self.animal = Animal.objects.create(
            farm=self.farm,
            group=self.group,
            species="Cattle",
            name_or_tag="Cow 1",
        )
        self.report = AgriculturalReport.objects.create(
            farmer=self.farmer,
            farm=self.farm,
            plot=self.plot,
            crop=self.crop,
            title="Yellowing maize leaves",
            description="Several leaves are yellowing.",
            category=AgriculturalReport.Category.CROP_HEALTH,
            severity=AgriculturalReport.Severity.HIGH,
        )

    def make_staff(self, email, group_name):
        staff = User.objects.create_user(
            email=email,
            password=self.password,
            first_name="Support",
            last_name="Staff",
            role=User.Role.STAFF,
        )
        staff.groups.add(Group.objects.get(name=group_name))
        return staff

    def test_only_platform_admins_and_permissioned_staff_can_open_platform_area(self):
        farmer_client = Client()
        farmer_client.force_login(self.farmer)
        self.assertEqual(
            farmer_client.get(reverse("platform:dashboard")).status_code,
            403,
        )

        professional_client = Client()
        professional_client.force_login(self.professional)
        self.assertEqual(
            professional_client.get(reverse("platform:dashboard")).status_code,
            403,
        )

        staff = self.make_staff("support@example.test", "Farmer Account Support")
        staff_client = Client()
        staff_client.force_login(staff)
        self.assertEqual(staff_client.get(reverse("platform:dashboard")).status_code, 200)
        self.assertEqual(staff_client.get(reverse("platform:farmers")).status_code, 200)
        self.assertEqual(staff_client.get(reverse("platform:professionals")).status_code, 403)
        self.assertEqual(staff_client.get(reverse("platform:staff")).status_code, 403)

    def test_farmer_directory_excludes_accounts_without_farmer_identity(self):
        farmer_without_profile = User.objects.create_user(
            email="incomplete-farmer@example.test",
            password=self.password,
            first_name="Incomplete",
            last_name="Farmer",
            role=User.Role.FARMER,
        )
        staff_flagged_farmer = User.objects.create_user(
            email="staff-flagged-farmer@example.test",
            password=self.password,
            first_name="Staff",
            last_name="Flagged",
            role=User.Role.FARMER,
            is_staff=True,
        )
        FarmerProfile.objects.create(user=staff_flagged_farmer)

        self.client.force_login(self.admin)
        response = self.client.get(reverse("platform:farmers"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.context["page_obj"].paginator.count, 1)
        self.assertEqual(
            [account.pk for account in response.context["page_obj"]],
            [self.farmer.pk],
        )
        self.assertEqual(
            self.client.get(
                reverse(
                    "platform:user-detail",
                    args=["farmers", farmer_without_profile.pk],
                )
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.get(
                reverse(
                    "platform:user-detail",
                    args=["farmers", staff_flagged_farmer.pk],
                )
            ).status_code,
            404,
        )

    def test_dashboard_statistics_use_database_records_and_county_filter(self):
        self.client.force_login(self.admin)
        response = self.client.get(reverse("platform:dashboard"), {"county": "Busia"})

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "platform/dashboard.html")
        metrics = {item["label"]: item["value"] for item in response.context["metrics"]}
        self.assertEqual(metrics["Registered farmers"], 1)
        self.assertEqual(metrics["Registered farms"], 1)
        self.assertEqual(metrics["Plots"], 1)
        self.assertEqual(metrics["Crop records"], 1)
        self.assertEqual(metrics["Livestock groups"], 1)
        self.assertEqual(metrics["Individual animals"], 1)
        self.assertEqual(metrics["Agricultural reports"], 1)
        self.assertEqual(metrics["Active unresolved cases"], 1)
        self.assertEqual(response.context["report_categories"][0]["count"], 1)
        featured = {
            item["display_label"]: item["value"]
            for item in response.context["featured_metrics"]
        }
        self.assertEqual(featured["Total farmers"], 1)
        self.assertEqual(featured["Total farms"], 1)
        self.assertEqual(featured["Total reports"], 1)
        self.assertEqual(featured["Active cases"], 1)
        self.assertContains(response, "Platform Administration Dashboard")
        self.assertContains(response, "platform-sidebar")
        self.assertContains(response, '<details class="platform-mobile-nav" open>')
        self.assertContains(response, 'class="platform-identity platform-topbar-profile"')
        operations = response.content.decode().split(
            '<span class="platform-nav-label">Operations</span>', 1
        )[1].split('<span class="platform-nav-label">Data oversight</span>', 1)[0]
        self.assertIn(f'href="{reverse("platform:reports")}"', operations)
        self.assertNotIn(f'href="{reverse("staff:unassigned")}"', operations)
        rendered = response.content.decode()
        sidebar = rendered.split('<aside class="platform-sidebar">', 1)[1].split(
            "</aside>", 1
        )[0]
        self.assertNotIn("platform-topbar-profile", sidebar)

    def test_operational_overview_pages_are_searchable_and_permission_gated(self):
        self.client.force_login(self.admin)
        pages = (
            ("platform:farms", "platform/farms.html", "Nangina Farm"),
            ("platform:crops", "platform/crops.html", "Maize"),
            ("platform:livestock", "platform/livestock.html", "Livestock records"),
            ("platform:reports", "platform/reports.html", self.report.report_reference),
        )
        for route, template, expected_text in pages:
            with self.subTest(route=route):
                response = self.client.get(reverse(route))
                self.assertEqual(response.status_code, 200)
                self.assertTemplateUsed(response, template)
                self.assertContains(response, expected_text)

        farms = self.client.get(reverse("platform:farms"), {"q": "Busia"})
        self.assertEqual(farms.context["page_obj"].paginator.count, 1)

        crops = self.client.get(reverse("platform:crops"), {"q": "Maize"})
        self.assertEqual(crops.context["page_obj"].paginator.count, 1)

        livestock = self.client.get(reverse("platform:livestock"), {"q": "Cow 1"})
        self.assertEqual(livestock.context["groups_page"].paginator.count, 0)
        self.assertEqual(livestock.context["animals_page"].paginator.count, 1)

        reports = self.client.get(reverse("platform:reports"), {"q": self.report.report_reference})
        self.assertEqual(reports.context["page_obj"].paginator.count, 1)
        self.assertNotContains(reports, self.report.description)

        support = self.make_staff("overview-support@example.test", "Farmer Account Support")
        self.client.force_login(support)
        for route, _template, _expected_text in pages:
            with self.subTest(unauthorized_route=route):
                self.assertEqual(self.client.get(reverse(route)).status_code, 403)

        operations = self.make_staff(
            "overview-operations@example.test",
            "Operational Reporting",
        )
        self.client.force_login(operations)
        for route, _template, _expected_text in pages:
            with self.subTest(authorized_route=route):
                self.assertEqual(self.client.get(reverse(route)).status_code, 200)

    def test_farmer_submitted_report_is_saved_and_visible_in_platform_overview(self):
        farmer_api = APIClient()
        farmer_api.force_authenticate(self.farmer)
        submission = farmer_api.post(
            reverse("farmer-report-list"),
            {
                "farm": self.farm.pk,
                "plot": self.plot.pk,
                "crop": self.crop.pk,
                "title": "New maize leaf spots",
                "description": "Brown spots appeared on the lower leaves.",
                "category": AgriculturalReport.Category.CROP_HEALTH,
                "severity": AgriculturalReport.Severity.HIGH,
                "location_details": "North plot",
            },
            format="json",
        )

        self.assertEqual(submission.status_code, 201, submission.data)
        saved_report = AgriculturalReport.objects.get(pk=submission.data["id"])
        self.assertEqual(saved_report.farmer, self.farmer)
        self.assertEqual(saved_report.status, AgriculturalReport.Status.SUBMITTED)

        self.client.force_login(self.admin)
        overview = self.client.get(
            reverse("platform:reports"),
            {"q": saved_report.report_reference},
        )

        self.assertEqual(overview.status_code, 200)
        self.assertEqual(overview.context["page_obj"].paginator.count, 1)
        self.assertContains(overview, saved_report.report_reference)
        self.assertContains(overview, "New maize leaf spots")
        self.assertContains(overview, "Amina Farmer")

    def test_farmer_account_status_changes_are_super_admin_only_and_audited(self):
        staff = self.make_staff("farmer-support@example.test", "Farmer Account Support")
        self.client.force_login(staff)
        detail_response = self.client.get(
            reverse(
                "platform:user-detail",
                kwargs={"category": "farmers", "user_id": self.farmer.pk},
            )
        )
        self.assertEqual(detail_response.status_code, 200)
        self.assertNotContains(detail_response, "Change account status")

        response = self.client.post(
            reverse(
                "platform:account-status",
                kwargs={"category": "farmers", "user_id": self.farmer.pk},
            ),
            {
                "account_status": User.AccountStatus.SUSPENDED,
                "reason": "Farmer requested a temporary account suspension.",
                "confirm": "on",
            },
        )
        self.assertEqual(response.status_code, 403)
        self.farmer.refresh_from_db()
        self.assertEqual(self.farmer.account_status, User.AccountStatus.ACTIVE)
        self.assertFalse(
            AdminAuditEvent.objects.filter(action="account_status_changed").exists()
        )
        with self.assertRaisesMessage(
            ValidationError, "You do not have permission to change this account status."
        ):
            change_account_status(
                actor=staff,
                target=self.farmer,
                account_status=User.AccountStatus.SUSPENDED,
                reason="Farmer requested a temporary account suspension.",
            )

        self.client.force_login(self.admin)
        response = self.client.post(
            reverse(
                "platform:account-status",
                kwargs={"category": "farmers", "user_id": self.farmer.pk},
            ),
            {
                "account_status": User.AccountStatus.SUSPENDED,
                "reason": "Confirmed by platform administration.",
                "confirm": "on",
            },
        )
        self.assertRedirects(
            response,
            reverse(
                "platform:user-detail",
                kwargs={"category": "farmers", "user_id": self.farmer.pk},
            ),
        )
        self.farmer.refresh_from_db()
        self.assertEqual(self.farmer.account_status, User.AccountStatus.SUSPENDED)
        event = AdminAuditEvent.objects.get(action="account_status_changed")
        self.assertEqual(event.actor, self.admin)
        self.assertEqual(event.target_user, self.farmer)
        self.assertIn("Confirmed by platform administration", event.reason)

        self.client.force_login(staff)
        self.assertEqual(
            self.client.post(
                reverse(
                    "platform:account-status",
                    kwargs={
                        "category": "farmers",
                        "user_id": self.professional.pk,
                    },
                ),
                {
                    "account_status": User.AccountStatus.SUSPENDED,
                    "reason": "Not authorized for this role.",
                    "confirm": "on",
                },
            ).status_code,
            404,
        )

    def test_status_changes_require_csrf_confirmation_and_reason(self):
        csrf_client = Client(enforce_csrf_checks=True)
        csrf_client.force_login(self.admin)
        detail_url = reverse(
            "platform:user-detail",
            kwargs={"category": "farmers", "user_id": self.farmer.pk},
        )
        self.assertEqual(csrf_client.get(detail_url).status_code, 200)
        status_url = reverse(
            "platform:account-status",
            kwargs={"category": "farmers", "user_id": self.farmer.pk},
        )
        rejected = csrf_client.post(
            status_url,
            {
                "account_status": User.AccountStatus.SUSPENDED,
                "reason": "No CSRF token.",
                "confirm": "on",
            },
        )
        self.assertEqual(rejected.status_code, 403)

        self.client.force_login(self.admin)
        missing_confirmation = self.client.post(
            status_url,
            {
                "account_status": User.AccountStatus.SUSPENDED,
                "reason": "",
            },
        )
        self.assertEqual(missing_confirmation.status_code, 302)
        self.farmer.refresh_from_db()
        self.assertEqual(self.farmer.account_status, User.AccountStatus.ACTIVE)

    def test_super_admin_can_create_staff_with_only_selected_delegated_groups(self):
        case_coordinators = Group.objects.get(name="Case Coordinators")
        self.client.force_login(self.admin)
        response = self.client.post(
            reverse("platform:staff-create"),
            {
                "first_name": "Miriam",
                "last_name": "Coordinator",
                "email": "miriam@example.test",
                "phone_number": "+254700000002",
                "groups": [case_coordinators.pk],
                "reason": "Coordinate incoming agricultural cases.",
            },
        )

        self.assertEqual(response.status_code, 302)
        staff = User.objects.get(email="miriam@example.test")
        self.assertEqual(staff.role, User.Role.STAFF)
        self.assertFalse(staff.is_staff)
        self.assertTrue(staff.has_perm("accounts.coordinate_cases"))
        self.assertEqual(list(staff.groups.all()), [case_coordinators])
        self.assertTrue(
            AdminAuditEvent.objects.filter(
                actor=self.admin,
                target_user=staff,
                action="staff_account_created",
            ).exists()
        )

    def test_staff_cannot_create_or_grant_themselves_permissions(self):
        staff = self.make_staff("coordinator@example.test", "Case Coordinators")
        self.client.force_login(staff)
        self.assertEqual(
            self.client.get(reverse("platform:staff-create")).status_code, 403
        )
        create_response = self.client.post(
            reverse("platform:staff-create"),
            {
                "first_name": "Another",
                "last_name": "Staff",
                "email": "another@example.test",
                "groups": [Group.objects.get(name="Farmer Account Support").pk],
                "reason": "Attempted privilege escalation.",
            },
        )
        self.assertEqual(create_response.status_code, 403)
        permission_response = self.client.post(
            reverse("platform:staff-permissions", kwargs={"user_id": staff.pk}),
            {"reason": "Attempted self-grant."},
        )
        self.assertEqual(permission_response.status_code, 403)
        self.assertFalse(User.objects.filter(email="another@example.test").exists())

    def test_password_reset_uses_email_flow_and_is_audited(self):
        staff = self.make_staff("reset@example.test", "Farmer Account Support")
        self.client.force_login(self.admin)
        with override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"):
            response = self.client.post(
                reverse(
                    "platform:account-password-reset",
                    kwargs={"category": "staff", "user_id": staff.pk},
                ),
                {
                    "reason": "Staff member needs an account setup link.",
                    "confirm": "on",
                },
            )

        self.assertEqual(response.status_code, 302)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(staff.email, mail.outbox[0].to)
        self.assertTrue(
            AdminAuditEvent.objects.filter(
                actor=self.admin,
                target_user=staff,
                action="account_password_reset_requested",
            ).exists()
        )
        self.assertIn(
            "/platform/reset/",
            mail.outbox[0].body,
        )

    def test_staff_login_uses_existing_session_auth_for_platform_workspace(self):
        staff = self.make_staff("login-support@example.test", "Farmer Account Support")
        response = self.client.post(
            reverse("staff:login"),
            {"username": staff.email, "password": self.password},
        )
        self.assertRedirects(response, reverse("platform:dashboard"))
        self.assertEqual(
            self.client.get(reverse("platform:dashboard")).status_code,
            200,
        )

    def test_agricultural_data_staff_can_manage_existing_reference_data(self):
        staff = self.make_staff("data-staff@example.test", "Agricultural Data Managers")
        self.client.force_login(staff)
        response = self.client.get(reverse("platform:reference-data"))
        self.assertEqual(response.status_code, 200)

        response = self.client.post(
            reverse("platform:reference-data-create"),
            {
                "name": "Platform Test Stage",
                "order": 9,
                "is_active": "on",
                "reason": "Add the flowering reference stage.",
            },
        )
        self.assertRedirects(response, reverse("platform:reference-data"))
        stage = CropGrowthStage.objects.get(name="Platform Test Stage")
        event = AdminAuditEvent.objects.get(resource_type="crop_growth_stage")
        self.assertEqual(event.actor, staff)
        self.assertEqual(event.resource_id, str(stage.pk))

    def test_last_active_super_admin_cannot_suspend_themselves(self):
        with self.assertRaisesMessage(ValidationError, "You cannot suspend your own account."):
            change_account_status(
                actor=self.admin,
                target=self.admin,
                account_status=User.AccountStatus.SUSPENDED,
                reason="Test suspension.",
            )
        self.admin.refresh_from_db()
        self.assertEqual(self.admin.account_status, User.AccountStatus.ACTIVE)
        self.assertFalse(
            AdminAuditEvent.objects.filter(
                action="account_status_changed",
                target_user=self.admin,
            ).exists()
        )

    def test_administrative_audit_events_are_append_only(self):
        event = AdminAuditEvent.objects.create(
            actor=self.admin,
            action="test_event",
            resource_type="user",
            resource_id=self.farmer.pk,
            reason="Recorded for test.",
        )
        with self.assertRaisesMessage(ValidationError, "append-only"):
            event.save()
        with self.assertRaisesMessage(ValidationError, "append-only"):
            event.delete()
        with self.assertRaisesMessage(ValidationError, "append-only"):
            AdminAuditEvent.objects.filter(pk=event.pk).update(reason="changed")


class StaffRoleMigrationTests(TransactionTestCase):
    reset_sequences = True

    def test_existing_organization_admins_migrate_to_case_coordinator_staff(self):
        try:
            executor = MigrationExecutor(connection)
            executor.migrate([("accounts", "0001_initial")])
            old_apps = executor.loader.project_state(
                [("accounts", "0001_initial")]
            ).apps
            OldUser = old_apps.get_model("accounts", "User")
            legacy_admin = OldUser.objects.create(
                email="legacy-coordinator@example.test",
                password="unused",
                first_name="Legacy",
                last_name="Coordinator",
                role="organization_admin",
                account_status="active",
                is_active=True,
                is_staff=False,
                is_superuser=False,
            )

            executor = MigrationExecutor(connection)
            executor.migrate([("reports", "0002_alter_caseassignment_assignment_role")])
            current_apps = MigrationExecutor(connection).loader.project_state(
                [("accounts", "0002_alter_user_options_alter_user_role")]
            ).apps
            CurrentUser = current_apps.get_model("accounts", "User")
            GroupModel = current_apps.get_model("auth", "Group")
            migrated_admin = CurrentUser.objects.get(pk=legacy_admin.pk)
            self.assertEqual(migrated_admin.role, "staff")
            self.assertTrue(
                GroupModel.objects.get(name="Case Coordinators")
                .user_set.filter(pk=migrated_admin.pk)
                .exists()
            )
        finally:
            executor = MigrationExecutor(connection)
            executor.migrate(executor.loader.graph.leaf_nodes())


class RoleAccessControlTests(TestCase):
    password = "Secure-test-pass-2026!"
    reason = "Documented reason for the access control test."

    def setUp(self):
        self.admin = User.objects.create_superuser(
            email="rbac-admin@example.test",
            password=self.password,
            first_name="Rbac",
            last_name="Admin",
        )
        self.staff = User.objects.create_user(
            email="rbac-staff@example.test",
            password=self.password,
            first_name="Rbac",
            last_name="Staff",
            role=User.Role.STAFF,
        )
        self.other_staff = User.objects.create_user(
            email="rbac-other@example.test",
            password=self.password,
            first_name="Other",
            last_name="Staff",
            role=User.Role.STAFF,
        )
        self.farmer = User.objects.create_user(
            email="rbac-farmer@example.test",
            password=self.password,
            first_name="Rbac",
            last_name="Farmer",
            role=User.Role.FARMER,
        )
        self.client.force_login(self.admin)

    def _seeded_role(self, name):
        return Role.objects.select_related("group").get(group__name=name)

    def test_super_admin_can_create_custom_role(self):
        response = self.client.post(
            reverse("platform:role-create"),
            {
                "name": "Field Supervisors",
                "slug": "field-supervisors",
                "description": "Supervise field data collection.",
                "is_assignable": "on",
                "permissions": ["coordinate_cases", "view_operational_reports"],
                "reason": self.reason,
            },
        )

        self.assertEqual(response.status_code, 302)
        role = Role.objects.select_related("group").get(slug="field-supervisors")
        self.assertEqual(role.name, "Field Supervisors")
        self.assertFalse(role.is_system)
        self.assertTrue(role.is_assignable)
        self.assertEqual(
            role.permission_codenames,
            {"coordinate_cases", "view_operational_reports"},
        )
        self.assertTrue(
            AdminAuditEvent.objects.filter(
                action="role_created", resource_id=str(role.pk)
            ).exists()
        )

    def test_permission_matrix_update_replaces_role_permissions(self):
        self.assertNotIn("manage_farmer_accounts", PLATFORM_STAFF_PERMISSIONS)
        role = create_role(
            actor=self.admin,
            name="Case Reviewers",
            slug="case-reviewers",
            permissions=["coordinate_cases"],
            reason=self.reason,
        )

        response = self.client.post(
            reverse("platform:role-permissions", args=[role.pk]),
            {
                "permissions": ["view_farmer_accounts", "manage_reference_data"],
                "reason": self.reason,
            },
        )

        self.assertEqual(response.status_code, 302)
        role.refresh_from_db()
        self.assertEqual(
            role.permission_codenames,
            {"view_farmer_accounts", "manage_reference_data"},
        )
        self.assertTrue(
            AdminAuditEvent.objects.filter(
                action="role_permissions_changed", resource_id=str(role.pk)
            ).exists()
        )

    def test_system_roles_cannot_be_renamed_or_deleted(self):
        role = self._seeded_role("Case Coordinators")

        self.client.post(
            reverse("platform:role-update", args=[role.pk]),
            {
                "name": "Renamed Coordinators",
                "slug": "renamed-coordinators",
                "description": "Attempted rename.",
                "is_assignable": "on",
                "reason": self.reason,
            },
        )
        role.refresh_from_db()
        self.assertEqual(role.name, "Case Coordinators")

        self.client.post(
            reverse("platform:role-delete", args=[role.pk]),
            {"reason": self.reason, "confirm": "on"},
        )
        self.assertTrue(Role.objects.filter(pk=role.pk).exists())

    def test_built_in_supervisor_role_permissions_are_locked(self):
        role = self._seeded_role("Platform Supervisors")
        before = role.permission_codenames

        self.client.post(
            reverse("platform:role-permissions", args=[role.pk]),
            {"permissions": ["coordinate_cases"], "reason": self.reason},
        )

        self.assertEqual(self._seeded_role("Platform Supervisors").permission_codenames, before)

    def test_roles_can_be_assigned_to_staff_with_audit(self):
        role = create_role(
            actor=self.admin,
            name="Farmer Support Leads",
            slug="farmer-support-leads",
            permissions=["view_farmer_accounts"],
            reason=self.reason,
        )

        response = self.client.post(
            reverse("platform:user-roles", args=[self.staff.pk]),
            {"roles": [role.pk], "reason": self.reason},
        )

        self.assertEqual(response.status_code, 302)
        self.assertTrue(self.staff.groups.filter(pk=role.group_id).exists())
        event = AdminAuditEvent.objects.get(action="user_roles_changed")
        self.assertEqual(event.target_user, self.staff)

    def test_role_membership_update_replaces_members(self):
        role = create_role(
            actor=self.admin,
            name="Reporting Officers",
            slug="reporting-officers",
            permissions=["view_operational_reports"],
            reason=self.reason,
        )
        role.group.user_set.add(self.staff)

        response = self.client.post(
            reverse("platform:role-members", args=[role.pk]),
            {"members": [self.other_staff.pk], "reason": self.reason},
        )

        self.assertEqual(response.status_code, 302)
        members = set(role.group.user_set.values_list("pk", flat=True))
        self.assertEqual(members, {self.other_staff.pk})

    def test_only_staff_accounts_can_receive_roles(self):
        role = create_role(
            actor=self.admin,
            name="Scoped Operators",
            slug="scoped-operators",
            permissions=["coordinate_cases"],
            reason=self.reason,
        )

        response = self.client.post(
            reverse("platform:user-roles", args=[self.farmer.pk]),
            {"roles": [role.pk], "reason": self.reason},
        )

        self.assertEqual(response.status_code, 302)
        self.assertFalse(self.farmer.groups.filter(pk=role.group_id).exists())

    def test_role_detail_shows_checked_permission_matrix(self):
        role = create_role(
            actor=self.admin,
            name="Matrix Viewers",
            slug="matrix-viewers",
            permissions=["view_admin_audit_log"],
            reason=self.reason,
        )

        response = self.client.get(reverse("platform:role-detail", args=[role.pk]))

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "platform/role_detail.html")
        checked = [
            permission["codename"]
            for group in response.context["permission_matrix"]
            for permission in group["permissions"]
            if permission["checked"]
        ]
        self.assertEqual(checked, ["view_admin_audit_log"])

    def test_non_super_admin_staff_cannot_manage_roles(self):
        staff_client = Client()
        staff_client.force_login(self.staff)

        self.assertEqual(staff_client.get(reverse("platform:roles")).status_code, 403)
        self.assertEqual(
            staff_client.post(
                reverse("platform:role-create"),
                {
                    "name": "Forbidden Role",
                    "slug": "forbidden-role",
                    "permissions": ["coordinate_cases"],
                    "reason": self.reason,
                },
            ).status_code,
            403,
        )
        self.assertFalse(Role.objects.filter(slug="forbidden-role").exists())
