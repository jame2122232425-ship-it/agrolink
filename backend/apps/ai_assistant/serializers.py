from rest_framework import serializers

from apps.ai_assistant.models import Conversation, Message
from apps.common.media import PrivateImageField


class MessageSerializer(serializers.ModelSerializer):
    image = PrivateImageField(resource="ai-message", read_only=True)

    class Meta:
        model = Message
        fields = ["id", "role", "content", "image", "is_demo", "created_at"]
        read_only_fields = fields


class ConversationSerializer(serializers.ModelSerializer):
    message_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Conversation
        fields = ["id", "title", "created_at", "updated_at", "message_count"]
        read_only_fields = fields


class ConversationDetailSerializer(ConversationSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta(ConversationSerializer.Meta):
        fields = ConversationSerializer.Meta.fields + ["messages"]


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField(
        max_length=4000,
        trim_whitespace=True,
        allow_blank=True,
        required=False,
    )
    image = PrivateImageField(resource="ai-message", required=False, allow_null=True)

    def validate(self, attrs):
        content = attrs.get("content", "").strip()
        image = attrs.get("image")
        if not content and not image:
            raise serializers.ValidationError(
                {"content": "Add a question or attach an image."}
            )
        attrs["content"] = content
        return attrs
