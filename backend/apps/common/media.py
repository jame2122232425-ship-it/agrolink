from django.urls import reverse
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers


ALLOWED_PRIVATE_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_PRIVATE_IMAGE_SIZE = 5 * 1024 * 1024


def validate_private_image(image):
    if image.size > MAX_PRIVATE_IMAGE_SIZE:
        raise DjangoValidationError("Image must not exceed 5 MB.")
    if getattr(getattr(image, "image", None), "format", None) not in ALLOWED_PRIVATE_IMAGE_FORMATS:
        raise DjangoValidationError("Upload a valid JPEG, PNG, or WebP image.")


class PrivateImageField(serializers.ImageField):
    allowed_formats = ALLOWED_PRIVATE_IMAGE_FORMATS
    max_upload_size = MAX_PRIVATE_IMAGE_SIZE

    def __init__(self, *, resource, **kwargs):
        self.resource = resource
        super().__init__(use_url=False, **kwargs)

    def to_internal_value(self, data):
        image = super().to_internal_value(data)
        try:
            validate_private_image(image)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.messages) from exc
        return image

    def to_representation(self, value):
        if not value:
            return None
        url = reverse(
            "private-image",
            kwargs={"resource": self.resource, "pk": value.instance.pk},
        )
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url
