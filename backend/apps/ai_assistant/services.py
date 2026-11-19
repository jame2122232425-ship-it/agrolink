from io import BytesIO

from django.conf import settings
from django.db import models
from django.db.models import Count
from PIL import Image, UnidentifiedImageError

from apps.ai_assistant.models import AIUsageEvent, Conversation, Message
from apps.ai_assistant.providers import AIProviderError, AIResponse, GeminiProvider
from apps.accounts.models import FarmerProfile
from apps.crops.models import Crop, CropHealthObservation
from apps.farms.models import Farm
from apps.livestock.models import (
    Animal,
    LivestockGroup,
    LivestockHealthObservation,
)


class AIServiceError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


def provider_configuration():
    if settings.AI_MOCK_MODE:
        return True
    return (
        settings.AI_PROVIDER == "gemini"
        and bool(settings.GEMINI_API_KEY.strip())
        and bool(settings.GEMINI_MODEL)
    )


def ai_status():
    configured = provider_configuration()
    return {
        "enabled": settings.AI_ENABLED,
        "provider": settings.AI_PROVIDER,
        "mock_mode": settings.AI_MOCK_MODE,
        "configured": configured,
        "available": settings.AI_ENABLED and configured,
    }


def _format_observation(text, max_length=300):
    return " ".join(text.split())[:max_length]


def get_farmer_context(user):
    context = []
    profile = FarmerProfile.objects.filter(user=user).only(
        "county", "sub_county", "ward", "village", "preferred_language"
    ).first()
    if profile:
        location = ", ".join(
            value
            for value in (profile.village, profile.ward, profile.sub_county, profile.county)
            if value
        )
        if location:
            context.append(f"Farmer location: {location}.")
        context.append(
            "Preferred language: "
            + ("Kiswahili." if profile.preferred_language == "sw" else "English.")
        )

    farms = list(
        Farm.objects.filter(farmer=user)
        .prefetch_related("plots")
        .order_by("id")[:8]
    )
    for farm in farms:
        description = (
            f"Farm: {farm.name}; location: {farm.location or farm.county or 'not recorded'}; "
            f"type: {farm.farming_type}; size: {farm.size} {farm.size_unit}."
        )
        plots = list(farm.plots.all()[:8])
        if plots:
            description += " Plots: " + "; ".join(
                f"{plot.name} (soil: {plot.get_soil_type_display()}, "
                f"irrigation: {'yes' if plot.irrigation_enabled else 'no'})"
                for plot in plots
            ) + "."
        context.append(description)

    crops = list(
        Crop.objects.filter(farm__farmer=user)
        .filter(status=Crop.Status.ACTIVE)
        .select_related("farm", "plot", "growth_stage")
        .order_by("-updated_at")[:8]
    )
    crop_ids = [crop.id for crop in crops]
    for crop in crops:
        context.append(
            f"Active crop: {crop.crop_name}"
            f"{f' ({crop.variety})' if crop.variety else ''}; farm: {crop.farm.name}; "
            f"plot: {crop.plot.name if crop.plot else 'not recorded'}; "
            f"growth stage: {crop.growth_stage.name if crop.growth_stage else 'not recorded'}; "
            f"planting date: {crop.planting_date or 'not recorded'}."
        )

    if crop_ids:
        observations = (
            CropHealthObservation.objects.filter(crop_id__in=crop_ids)
            .select_related("crop")
            .order_by("-observation_date", "-id")[:6]
        )
        context.extend(
            f"Farmer-reported crop observation for {item.crop.crop_name} "
            f"({item.observation_date}, severity {item.severity}): "
            f"{_format_observation(item.symptoms_observed)}"
            for item in observations
        )

    groups = list(
        LivestockGroup.objects.filter(farm__farmer=user, is_active=True)
        .select_related("farm")
        .order_by("id")[:8]
    )
    for group in groups:
        context.append(
            f"Active livestock group: {group.species}"
            f"{f' ({group.breed})' if group.breed else ''}; group: {group.group_name}; "
            f"farm: {group.farm.name}; count: {group.animal_count}."
        )

    animals = list(
        Animal.objects.filter(farm__farmer=user, status=Animal.Status.ACTIVE)
        .select_related("farm")
        .order_by("id")[:8]
    )
    animal_ids = [animal.id for animal in animals]
    for animal in animals:
        context.append(
            f"Registered animal: {animal.species}"
            f"{f' ({animal.breed})' if animal.breed else ''}; "
            f"farm: {animal.farm.name}; purpose: "
            f"{animal.production_purpose or 'not recorded'}."
        )

    livestock_observations = LivestockHealthObservation.objects.filter(
        models.Q(animal_id__in=animal_ids)
        | models.Q(group_id__in=[group.id for group in groups])
    ).order_by("-observation_date", "-id")[:6]
    for item in livestock_observations:
        context.append(
            f"Farmer-reported livestock observation ({item.observation_date}, "
            f"severity {item.severity}): "
            f"{_format_observation(item.symptoms_reported)}"
        )

    return "\n".join(context)[:8000]


def _get_provider():
    if not settings.AI_ENABLED:
        raise AIServiceError("ai_disabled", "The AI assistant is currently disabled.")
    if settings.AI_MOCK_MODE:
        return None
    if settings.AI_PROVIDER != "gemini":
        raise AIServiceError(
            "provider_unavailable", "The configured AI provider is not supported."
        )
    if not settings.GEMINI_API_KEY.strip():
        raise AIServiceError(
            "provider_not_configured",
            "The AI assistant is not configured. Please contact the service administrator.",
        )
    if not settings.GEMINI_MODEL:
        raise AIServiceError(
            "provider_not_configured",
            "The AI assistant is not configured. Please contact the service administrator.",
        )
    return GeminiProvider(
        api_key=settings.GEMINI_API_KEY,
        model=settings.GEMINI_MODEL,
        timeout_seconds=settings.AI_REQUEST_TIMEOUT_SECONDS,
    )


def _conversation_history(conversation):
    prior = list(
        conversation.messages.order_by("-created_at", "-id")
        .values_list("role", "content")[:12]
    )
    return list(reversed(prior))


AI_IMAGE_MIME_TYPES = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}


def _message_image(message):
    if not message or not message.image:
        return None
    try:
        message.image.open("rb")
        try:
            data = message.image.read()
        finally:
            message.image.close()
    except (OSError, ValueError):
        raise AIServiceError(
            "invalid_image", "The attached image could not be read."
        ) from None
    try:
        with Image.open(BytesIO(data)) as image:
            mime_type = AI_IMAGE_MIME_TYPES.get(image.format)
    except (UnidentifiedImageError, OSError):
        mime_type = None
    if not mime_type:
        raise AIServiceError(
            "invalid_image", "The attached image format is not supported."
        )
    return data, mime_type


def _latest_context_image(conversation, exclude_id=None):
    recent = list(
        conversation.messages.order_by("-created_at", "-id").only(
            "id", "role", "image"
        )[:12]
    )
    for message in recent:
        if (
            message.id != exclude_id
            and message.role == Message.Role.USER
            and message.image
        ):
            return message
    return None


def generate_reply(conversation, user, image_message=None):
    provider = _get_provider()
    history = _conversation_history(conversation)
    context = get_farmer_context(user)

    if settings.AI_MOCK_MODE:
        return AIResponse(
            text=(
                "Demonstration mode is active. No live Gemini response or agricultural "
                "guidance was generated. Configure the Gemini provider to receive live responses."
            ),
            is_demo=True,
        )

    image = _message_image(image_message)
    if image is None:
        # Gemini does not retain state between requests, so keep the most recent
        # photo available for follow-up questions in the same conversation.
        try:
            image = _message_image(
                _latest_context_image(
                    conversation,
                    exclude_id=image_message.id if image_message else None,
                )
            )
        except AIServiceError:
            image = None

    try:
        return provider.generate(history=history, context=context, image=image)
    except AIProviderError:
        raise
    finally:
        provider.close()


def record_usage(
    *,
    user,
    conversation,
    provider,
    succeeded,
    duration_ms,
    input_tokens=None,
    output_tokens=None,
    error_code="",
):
    AIUsageEvent.objects.create(
        user=user,
        conversation=conversation,
        provider=provider,
        succeeded=succeeded,
        duration_ms=duration_ms,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        error_code=error_code,
    )


def list_conversations(user):
    return (
        Conversation.objects.filter(owner=user)
        .annotate(message_count=Count("messages"))
        .order_by("-updated_at", "-id")
    )
