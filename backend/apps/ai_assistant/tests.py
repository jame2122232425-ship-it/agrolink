from io import BytesIO

import httpx
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase
from unittest.mock import Mock, patch

from apps.accounts.models import FarmerProfile, User
from apps.ai_assistant.models import AIUsageEvent, Conversation, Message
from apps.ai_assistant.providers import AIProviderError, GeminiProvider
from apps.ai_assistant.services import get_farmer_context
from apps.crops.models import Crop, CropHealthObservation
from apps.farms.models import Farm
from apps.livestock.models import LivestockGroup


def image_upload(name="leaf.png", image_format="PNG", content_type="image/png"):
    buffer = BytesIO()
    Image.new("RGB", (24, 24), (34, 139, 34)).save(buffer, format=image_format)
    buffer.seek(0)
    return SimpleUploadedFile(name, buffer.read(), content_type=content_type)


class GeminiProviderTests(APITestCase):
    def test_provider_sends_configured_model_and_returns_text_and_usage(self):
        response = Mock()
        response.text = "Check the soil moisture first."
        response.usage_metadata.prompt_token_count = 23
        response.usage_metadata.candidates_token_count = 9
        client = Mock()
        client.models.generate_content.return_value = response

        with patch("apps.ai_assistant.providers.genai.Client", return_value=client) as factory:
            provider = GeminiProvider("private-key", "confirmed-model", 12)
            result = provider.generate([("user", "My maize leaves are yellow.")], "County: Busia")
            provider.close()

        self.assertEqual(result.text, "Check the soil moisture first.")
        self.assertEqual(result.input_tokens, 23)
        self.assertEqual(result.output_tokens, 9)
        self.assertEqual(factory.call_args.kwargs["api_key"], "private-key")
        self.assertEqual(
            factory.call_args.kwargs["http_options"].timeout,
            12000,
        )
        self.assertEqual(
            client.models.generate_content.call_args.kwargs["model"],
            "confirmed-model",
        )
        client.close.assert_called_once()

    def test_provider_attaches_image_bytes_to_the_request(self):
        response = Mock()
        response.text = "The leaf shows possible nutrient stress."
        response.usage_metadata.prompt_token_count = 12
        response.usage_metadata.candidates_token_count = 6
        client = Mock()
        client.models.generate_content.return_value = response

        with patch("apps.ai_assistant.providers.genai.Client", return_value=client):
            provider = GeminiProvider("private-key", "model", 12)
            provider.generate(
                [("user", "Review this leaf.")],
                "",
                image=(b"image-bytes", "image/png"),
            )
            provider.close()

        contents = client.models.generate_content.call_args.kwargs["contents"]
        parts = contents[-1].parts
        self.assertIn("Review this leaf.", parts[0].text)
        self.assertEqual(parts[1].inline_data.mime_type, "image/png")
        self.assertEqual(parts[1].inline_data.data, b"image-bytes")

    def test_provider_maps_timeout_and_rejects_empty_response(self):
        client = Mock()
        client.models.generate_content.side_effect = httpx.TimeoutException("timeout")
        with patch("apps.ai_assistant.providers.genai.Client", return_value=client):
            provider = GeminiProvider("private-key", "model", 1)
            with self.assertRaises(AIProviderError) as error:
                provider.generate([("user", "Question")], "")
        self.assertEqual(error.exception.code, "timeout")

        client.models.generate_content.side_effect = None
        client.models.generate_content.return_value.text = None
        with patch("apps.ai_assistant.providers.genai.Client", return_value=client):
            provider = GeminiProvider("private-key", "model", 1)
            with self.assertRaises(AIProviderError) as error:
                provider.generate([("user", "Question")], "")
        self.assertEqual(error.exception.code, "invalid_response")

    def test_provider_maps_rate_limit_errors(self):
        from google.genai.errors import APIError

        client = Mock()
        client.models.generate_content.side_effect = APIError(
            429,
            {"error": {"message": "quota exceeded"}},
        )
        with patch("apps.ai_assistant.providers.genai.Client", return_value=client):
            provider = GeminiProvider("private-key", "model", 1)
            with self.assertRaises(AIProviderError) as error:
                provider.generate([("user", "Question")], "")
        self.assertEqual(error.exception.code, "rate_limited")


class AIAssistantAPITests(APITestCase):
    def setUp(self):
        self.farmer = User.objects.create_user(
            email="ai-farmer@example.test",
            password="Secure-test-pass-2026!",
            first_name="Amina",
            last_name="Farmer",
        )
        FarmerProfile.objects.create(
            user=self.farmer,
            county="Busia",
            sub_county="Samia",
            preferred_language="sw",
        )
        self.other_farmer = User.objects.create_user(
            email="other-ai-farmer@example.test",
            password="Secure-test-pass-2026!",
            first_name="Other",
            last_name="Farmer",
        )
        self.farm = Farm.objects.create(
            farmer=self.farmer, name="Amina Farm", county="Busia", size="3.00"
        )
        self.other_farm = Farm.objects.create(
            farmer=self.other_farmer, name="Private Farm", county="Nakuru", size="2.00"
        )
        self.conversation = Conversation.objects.create(owner=self.farmer)
        self.client.force_authenticate(self.farmer)

    def create_conversation(self):
        response = self.client.post("/api/v1/ai/conversations/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        return response.data["id"]

    @override_settings(AI_ENABLED=True, AI_PROVIDER="gemini", GEMINI_API_KEY="")
    def test_missing_api_key_is_reported_without_exposing_credentials(self):
        response = self.client.get("/api/v1/ai/status/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["configured"])
        self.assertNotIn("api_key", response.data)

        conversation_id = self.create_conversation()
        response = self.client.post(
            f"/api/v1/ai/conversations/{conversation_id}/messages/",
            {"content": "How are my crops?"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["code"], "provider_not_configured")
        self.assertNotIn("private-key", str(response.data))
        self.assertEqual(AIUsageEvent.objects.filter(succeeded=False).count(), 1)

    @override_settings(
        AI_ENABLED=True,
        AI_PROVIDER="gemini",
        AI_MOCK_MODE=False,
        GEMINI_API_KEY="test-key",
        GEMINI_MODEL="gemini-3.5-flash-lite",
    )
    @patch("apps.ai_assistant.services.GeminiProvider")
    def test_authenticated_message_is_saved_and_returned(self, provider_class):
        provider_class.return_value.generate.return_value = Mock(
            text="Check the soil and describe the leaf pattern.",
            input_tokens=31,
            output_tokens=12,
            is_demo=False,
        )
        conversation_id = self.create_conversation()

        response = self.client.post(
            f"/api/v1/ai/conversations/{conversation_id}/messages/",
            {"content": "My maize leaves are turning yellow."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["assistant_message"]["content"], "Check the soil and describe the leaf pattern.")
        self.assertEqual(
            list(
                Conversation.objects.get(pk=conversation_id)
                .messages.values_list("role", "content")
            ),
            [
                ("user", "My maize leaves are turning yellow."),
                ("assistant", "Check the soil and describe the leaf pattern."),
            ],
        )
        history = self.client.get(f"/api/v1/ai/conversations/{conversation_id}/")
        self.assertEqual(history.status_code, status.HTTP_200_OK)
        self.assertEqual(len(history.data["messages"]), 2)
        usage = AIUsageEvent.objects.get(succeeded=True)
        self.assertEqual(usage.input_tokens, 31)
        self.assertEqual(usage.output_tokens, 12)

    @override_settings(
        AI_ENABLED=True,
        AI_PROVIDER="gemini",
        AI_MOCK_MODE=False,
        GEMINI_API_KEY="test-key",
        GEMINI_MODEL="gemini-3.5-flash-lite",
    )
    @patch("apps.ai_assistant.services.GeminiProvider")
    def test_image_message_is_saved_forwarded_and_owner_scoped(self, provider_class):
        provider_class.return_value.generate.return_value = Mock(
            text="I can see yellowing on the lower leaves.",
            input_tokens=41,
            output_tokens=14,
            is_demo=False,
        )
        conversation_id = self.create_conversation()

        response = self.client.post(
            f"/api/v1/ai/conversations/{conversation_id}/messages/",
            {"content": "What do you notice?", "image": image_upload()},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user_message = Message.objects.get(
            conversation_id=conversation_id, role=Message.Role.USER
        )
        self.assertTrue(user_message.image.name.startswith("ai/messages/"))
        image_argument = provider_class.return_value.generate.call_args.kwargs["image"]
        self.assertIsNotNone(image_argument)
        self.assertEqual(image_argument[1], "image/png")
        self.assertGreater(len(image_argument[0]), 0)

        history = self.client.get(f"/api/v1/ai/conversations/{conversation_id}/")
        user_payload = next(
            message
            for message in history.data["messages"]
            if message["id"] == user_message.id
        )
        self.assertIn(
            "/api/v1/private-images/ai-message/", user_payload["image"]
        )

        image_response = self.client.get(
            f"/api/v1/private-images/ai-message/{user_message.id}/"
        )
        self.assertEqual(image_response.status_code, status.HTTP_200_OK)
        self.assertEqual(image_response["Content-Type"], "image/png")

        self.client.force_authenticate(self.other_farmer)
        denied = self.client.get(
            f"/api/v1/private-images/ai-message/{user_message.id}/"
        )
        self.assertEqual(denied.status_code, status.HTTP_404_NOT_FOUND)

    @override_settings(
        AI_ENABLED=True,
        AI_PROVIDER="gemini",
        AI_MOCK_MODE=False,
        GEMINI_API_KEY="test-key",
        GEMINI_MODEL="gemini-3.5-flash-lite",
    )
    @patch("apps.ai_assistant.services.GeminiProvider")
    def test_follow_up_reuses_the_latest_context_image(self, provider_class):
        provider_class.return_value.generate.return_value = Mock(
            text="The upper leaves look greener in this view.",
            input_tokens=20,
            output_tokens=8,
            is_demo=False,
        )
        conversation_id = self.create_conversation()

        self.client.post(
            f"/api/v1/ai/conversations/{conversation_id}/messages/",
            {"content": "What do you notice?", "image": image_upload()},
            format="multipart",
        )
        provider_class.return_value.generate.reset_mock()

        response = self.client.post(
            f"/api/v1/ai/conversations/{conversation_id}/messages/",
            {"content": "What about the upper leaves?"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        image_argument = provider_class.return_value.generate.call_args.kwargs["image"]
        self.assertIsNotNone(image_argument)
        self.assertEqual(image_argument[1], "image/png")

    @override_settings(AI_ENABLED=True, AI_MOCK_MODE=True)
    def test_image_only_message_uses_a_fallback_question(self):
        conversation_id = self.create_conversation()

        response = self.client.post(
            f"/api/v1/ai/conversations/{conversation_id}/messages/",
            {"image": image_upload()},
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user_message = Message.objects.get(
            conversation_id=conversation_id, role=Message.Role.USER
        )
        self.assertIn("attached image", user_message.content)
        self.assertTrue(user_message.image)

    def test_non_image_upload_is_rejected(self):
        conversation_id = self.create_conversation()

        response = self.client.post(
            f"/api/v1/ai/conversations/{conversation_id}/messages/",
            {
                "content": "Please review this.",
                "image": SimpleUploadedFile(
                    "notes.txt", b"not an image", content_type="text/plain"
                ),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("image", response.data)

    def test_conversations_are_private_and_owner_scoped(self):
        self.client.force_authenticate(self.other_farmer)
        response = self.client.get("/api/v1/ai/conversations/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])

        response = self.client.get(f"/api/v1/ai/conversations/{self.conversation.pk}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        response = self.client.post(
            f"/api/v1/ai/conversations/{self.conversation.pk}/messages/",
            {"content": "Show me the history."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_context_contains_only_authenticated_farm_records(self):
        crop = Crop.objects.create(
            farm=self.farm,
            crop_name="Maize",
            variety="H513",
            area_planted="1.00",
        )
        CropHealthObservation.objects.create(
            crop=crop,
            symptoms_observed="Lower leaves yellowing",
            severity="moderate",
        )
        LivestockGroup.objects.create(
            farm=self.farm,
            species="dairy cattle",
            group_name="Dairy group",
            animal_count=2,
        )
        Crop.objects.create(
            farm=self.other_farm,
            crop_name="Private rice",
            area_planted="1.00",
        )

        context = get_farmer_context(self.farmer)

        self.assertIn("Amina Farm", context)
        self.assertIn("Maize", context)
        self.assertIn("Lower leaves yellowing", context)
        self.assertIn("Dairy group", context)
        self.assertNotIn("Private Farm", context)
        self.assertNotIn("Private rice", context)
        self.assertNotIn(self.farmer.email, context)

    @override_settings(AI_ENABLED=True, AI_MOCK_MODE=True)
    @patch("apps.ai_assistant.services.GeminiProvider")
    def test_mock_mode_returns_an_explicit_demonstration_message(self, provider_class):
        conversation_id = self.create_conversation()
        response = self.client.post(
            f"/api/v1/ai/conversations/{conversation_id}/messages/",
            {"content": "What should I do?"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["assistant_message"]["is_demo"])
        self.assertIn("Demonstration mode", response.data["assistant_message"]["content"])
        provider_class.assert_not_called()

    @override_settings(AI_ENABLED=False, AI_MOCK_MODE=False)
    def test_disabled_mode_rejects_messages_without_creating_an_assistant_reply(self):
        conversation_id = self.create_conversation()
        response = self.client.post(
            f"/api/v1/ai/conversations/{conversation_id}/messages/",
            {"content": "Question"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["code"], "ai_disabled")
        self.assertEqual(
            Message.objects.filter(conversation_id=conversation_id).count(), 1
        )

    def test_message_validation_rejects_empty_and_overlong_content(self):
        conversation_id = self.create_conversation()
        for content in ("  ", "x" * 4001):
            response = self.client.post(
                f"/api/v1/ai/conversations/{conversation_id}/messages/",
                {"content": content},
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_conversation_endpoints_require_farmer_authentication(self):
        self.client.force_authenticate(None)
        response = self.client.get("/api/v1/ai/conversations/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_inactive_farmer_cannot_use_assistant(self):
        self.farmer.account_status = User.AccountStatus.SUSPENDED
        self.farmer.save(update_fields=["account_status", "updated_at"])
        response = self.client.get("/api/v1/ai/status/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @override_settings(
        AI_ENABLED=True,
        AI_PROVIDER="gemini",
        AI_MOCK_MODE=False,
        GEMINI_API_KEY="test-key",
    )
    @patch(
        "apps.ai_assistant.views.generate_reply",
        side_effect=AIProviderError("rate_limited", "Safe public error."),
    )
    def test_provider_failures_are_reported_without_internal_details(self, _generate_reply):
        conversation_id = self.create_conversation()
        response = self.client.post(
            f"/api/v1/ai/conversations/{conversation_id}/messages/",
            {"content": "Question"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["code"], "rate_limited")
        self.assertEqual(response.data["detail"], "Safe public error.")
        event = AIUsageEvent.objects.get(succeeded=False)
        self.assertEqual(event.error_code, "rate_limited")
        self.assertEqual(event.provider, "gemini")
        _generate_reply.assert_called_once()
