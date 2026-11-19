from io import BytesIO
from tempfile import TemporaryDirectory

from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import FarmerProfile, User
from apps.common.storage import private_media_storage


class AccountAPITests(APITestCase):
    def registration_payload(self, **overrides):
        payload = {
            "first_name": "Amina",
            "last_name": "Otieno",
            "email": "amina@example.test",
            "phone_number": "+254700000001",
            "password": "Secure-test-pass-2026!",
            "password_confirm": "Secure-test-pass-2026!",
            "farmer_profile": {
                "county": "Busia",
                "sub_county": "Samia",
                "ward": "Nangina",
                "village": "Bumala",
                "preferred_language": "sw",
            },
        }
        payload.update(overrides)
        return payload

    def test_registration_creates_farmer_and_profile(self):
        response = self.client.post(
            "/api/v1/auth/register/", self.registration_payload(), format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email="amina@example.test")
        self.assertEqual(user.role, User.Role.FARMER)
        self.assertTrue(user.check_password("Secure-test-pass-2026!"))
        self.assertEqual(user.farmer_profile.county, "Busia")
        self.assertEqual(FarmerProfile.objects.count(), 1)

    def test_registration_does_not_require_csrf_from_an_existing_session(self):
        existing_user = User.objects.create_user(
            email="existing@example.test",
            password="Secure-test-pass-2026!",
            first_name="Existing",
            last_name="User",
        )
        FarmerProfile.objects.create(user=existing_user)
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(existing_user)

        response = client.post(
            "/api/v1/auth/register/",
            self.registration_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email="amina@example.test").exists())

    def test_registration_rejects_privileged_role_assignment(self):
        response = self.client.post(
            "/api/v1/auth/register/",
            self.registration_payload(role=User.Role.PLATFORM_ADMIN),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.exists())

    def test_registration_requires_phone_and_county(self):
        missing_phone = self.registration_payload(phone_number="")
        response = self.client.post(
            "/api/v1/auth/register/", missing_phone, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone_number", response.data)

        missing_county = self.registration_payload(
            farmer_profile={"county": ""}
        )
        response = self.client.post(
            "/api/v1/auth/register/", missing_county, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("farmer_profile", response.data)
        self.assertIn("county", response.data["farmer_profile"])

    def test_profile_picture_upload_is_private_and_owner_scoped(self):
        farmer = User.objects.create_user(
            email="picture@example.test",
            password="Secure-test-pass-2026!",
            first_name="Picture",
            last_name="Farmer",
        )
        profile = FarmerProfile.objects.create(user=farmer, county="Busia")
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
        upload = SimpleUploadedFile(
            "profile.png",
            buffer.getvalue(),
            content_type="image/png",
        )
        client = APIClient()
        client.force_authenticate(farmer)

        response = client.patch(
            "/api/v1/farmer/profile/",
            {"profile_picture": upload},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        image_url = response.data["profile_picture"]
        self.assertIn(f"/api/v1/private-images/profile-picture/{profile.pk}/", image_url)
        self.assertFalse(response.data["profile_picture"].startswith("/media/"))

        image_response = client.get(image_url)
        self.assertEqual(image_response.status_code, status.HTTP_200_OK)
        self.assertEqual(image_response["Cache-Control"], "private, no-store")
        image_bytes = b"".join(image_response.streaming_content)
        self.assertTrue(image_bytes.startswith(b"\x89PNG"))
        image_response.close()

        other_farmer = User.objects.create_user(
            email="other-picture@example.test",
            password="Secure-test-pass-2026!",
            first_name="Other",
            last_name="Farmer",
        )
        client.force_authenticate(other_farmer)
        self.assertEqual(client.get(image_url).status_code, status.HTTP_404_NOT_FOUND)

    def test_registration_rejects_mismatched_or_weak_password(self):
        response = self.client.post(
            "/api/v1/auth/register/",
            self.registration_payload(password_confirm="Different-pass-2026!"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.exists())

    def test_registration_rejects_weak_password(self):
        response = self.client.post(
            "/api/v1/auth/register/",
            self.registration_payload(password="123", password_confirm="123"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)
        self.assertFalse(User.objects.exists())

    def test_login_returns_jwt_pair(self):
        user = User.objects.create_user(
            email="amina@example.test",
            password="Secure-test-pass-2026!",
            first_name="Amina",
            last_name="Otieno",
        )
        FarmerProfile.objects.create(user=user)

        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "amina@example.test", "password": "Secure-test-pass-2026!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_logout_blacklists_refresh_token(self):
        user = User.objects.create_user(
            email="amina@example.test",
            password="Secure-test-pass-2026!",
            first_name="Amina",
            last_name="Otieno",
        )
        login = self.client.post(
            "/api/v1/auth/login/",
            {"email": "amina@example.test", "password": "Secure-test-pass-2026!"},
            format="json",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

        response = self.client.post(
            "/api/v1/auth/logout/", {"refresh": login.data["refresh"]}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_205_RESET_CONTENT)

        refresh_response = self.client.post(
            "/api/v1/auth/refresh/", {"refresh": login.data["refresh"]}, format="json"
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_rotates_tokens_and_blacklists_previous_refresh(self):
        user = User.objects.create_user(
            email="amina@example.test",
            password="Secure-test-pass-2026!",
            first_name="Amina",
            last_name="Otieno",
        )
        login = self.client.post(
            "/api/v1/auth/login/",
            {"email": user.email, "password": "Secure-test-pass-2026!"},
            format="json",
        )

        response = self.client.post(
            "/api/v1/auth/refresh/", {"refresh": login.data["refresh"]}, format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertNotEqual(response.data["refresh"], login.data["refresh"])
        old_refresh_response = self.client.post(
            "/api/v1/auth/refresh/", {"refresh": login.data["refresh"]}, format="json"
        )
        self.assertEqual(old_refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_cannot_blacklist_another_users_refresh_token(self):
        first_user = User.objects.create_user(
            email="first@example.test",
            password="Secure-test-pass-2026!",
            first_name="First",
            last_name="Farmer",
        )
        second_user = User.objects.create_user(
            email="second@example.test",
            password="Secure-test-pass-2026!",
            first_name="Second",
            last_name="Farmer",
        )
        first_tokens = self.client.post(
            "/api/v1/auth/login/",
            {"email": first_user.email, "password": "Secure-test-pass-2026!"},
            format="json",
        ).data
        second_tokens = self.client.post(
            "/api/v1/auth/login/",
            {"email": second_user.email, "password": "Secure-test-pass-2026!"},
            format="json",
        ).data
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {first_tokens['access']}")

        response = self.client.post(
            "/api/v1/auth/logout/", {"refresh": second_tokens["refresh"]}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        refresh_response = self.client.post(
            "/api/v1/auth/refresh/", {"refresh": second_tokens["refresh"]}, format="json"
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)

    def test_refresh_rejects_suspended_account(self):
        user = User.objects.create_user(
            email="amina@example.test",
            password="Secure-test-pass-2026!",
            first_name="Amina",
            last_name="Otieno",
        )
        login = self.client.post(
            "/api/v1/auth/login/",
            {"email": "amina@example.test", "password": "Secure-test-pass-2026!"},
            format="json",
        )
        user.account_status = User.AccountStatus.SUSPENDED
        user.save(update_fields=["account_status", "updated_at"])

        response = self.client.post(
            "/api/v1/auth/refresh/", {"refresh": login.data["refresh"]}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_pending_user_cannot_log_in(self):
        User.objects.create_user(
            email="pending@example.test",
            password="Secure-test-pass-2026!",
            first_name="Pending",
            last_name="Farmer",
            account_status=User.AccountStatus.PENDING,
        )

        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "pending@example.test", "password": "Secure-test-pass-2026!"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_requires_authentication_and_returns_profile(self):
        user = User.objects.create_user(
            email="amina@example.test",
            password="Secure-test-pass-2026!",
            first_name="Amina",
            last_name="Otieno",
        )
        FarmerProfile.objects.create(user=user, county="Busia")

        anonymous_response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(anonymous_response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.force_authenticate(user)
        response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["county"], "Busia")
        self.assertNotIn("password", response.data["user"])
