from django.urls import reverse
from rest_framework import serializers

from apps.common.media import PrivateImageField
from apps.community.models import CommunityContentReport, CommunityPost, CommunityReaction, CommunityReply


def display_name(user):
    if not user:
        return "Farmer"
    return f"{user.first_name} {user.last_name[:1]}".strip()


class CommunityReplySerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = CommunityReply
        fields = ("id", "post", "body", "author_name", "is_mine", "created_at", "updated_at")
        read_only_fields = ("id", "post", "author_name", "is_mine", "created_at", "updated_at")

    def get_author_name(self, obj):
        return display_name(obj.author)

    def get_is_mine(self, obj):
        return obj.author_id == self.context["request"].user.pk


class CommunityPostSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    reply_count = serializers.IntegerField(read_only=True)
    reaction_count = serializers.IntegerField(read_only=True)
    reacted_by_me = serializers.BooleanField(read_only=True)
    is_mine = serializers.SerializerMethodField()
    accepted_reply_preview = serializers.SerializerMethodField()
    image = PrivateImageField(resource="community-post", required=False, allow_null=True)

    class Meta:
        model = CommunityPost
        fields = (
            "id", "title", "body", "topic", "county", "status", "image",
            "author_name", "is_mine", "reply_count", "reaction_count", "reacted_by_me",
            "accepted_reply", "accepted_reply_preview", "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "county", "status", "author_name", "is_mine", "reply_count",
            "reaction_count", "reacted_by_me", "accepted_reply", "accepted_reply_preview",
            "created_at", "updated_at",
        )

    def get_author_name(self, obj):
        return display_name(obj.author)

    def get_is_mine(self, obj):
        return obj.author_id == self.context["request"].user.pk

    def get_accepted_reply_preview(self, obj):
        reply = obj.accepted_reply
        if not reply or reply.is_hidden:
            return None
        return {"id": reply.pk, "body": reply.body[:220], "author_name": display_name(reply.author)}


class CommunityContentReportSerializer(serializers.ModelSerializer):
    target_title = serializers.SerializerMethodField()

    class Meta:
        model = CommunityContentReport
        fields = ("id", "post", "reply", "reason", "details", "status", "target_title", "created_at")
        read_only_fields = ("id", "status", "target_title", "created_at")

    def get_target_title(self, obj):
        return obj.post.title if obj.post_id else obj.reply.body[:100]

    def validate(self, attrs):
        if bool(attrs.get("post")) == bool(attrs.get("reply")):
            raise serializers.ValidationError("Select exactly one post or reply to report.")
        return attrs
