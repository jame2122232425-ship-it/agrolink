from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q

from apps.common.storage import private_media_storage


class CommunityPost(models.Model):
    class Topic(models.TextChoices):
        CROPS = "crops", "Crops"
        LIVESTOCK = "livestock", "Livestock"
        SOIL = "soil", "Soil & compost"
        WEATHER = "weather", "Weather"
        MARKETS = "markets", "Markets"
        GENERAL = "general", "General"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        RESOLVED = "resolved", "Resolved"
        HIDDEN = "hidden", "Hidden"

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="community_posts"
    )
    title = models.CharField(max_length=180)
    body = models.TextField(max_length=8000)
    topic = models.CharField(max_length=16, choices=Topic.choices, default=Topic.GENERAL)
    county = models.CharField(max_length=80, blank=True)
    image = models.ImageField(
        storage=private_media_storage, upload_to="community/posts/", blank=True
    )
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN)
    accepted_reply = models.ForeignKey(
        "CommunityReply", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="accepted_by_posts",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["topic", "status", "-created_at"]),
            models.Index(fields=["county", "status", "-created_at"]),
        ]

    def __str__(self):
        return self.title


class CommunityReply(models.Model):
    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, related_name="replies")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="community_replies"
    )
    body = models.TextField(max_length=5000)
    is_hidden = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"Reply to {self.post_id} by {self.author_id}"


class CommunityReaction(models.Model):
    post = models.ForeignKey(CommunityPost, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="community_reactions"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["post", "user"], name="unique_community_post_reaction")]


class CommunityContentReport(models.Model):
    class Reason(models.TextChoices):
        MISINFORMATION = "misinformation", "Potentially harmful agricultural advice"
        ABUSE = "abuse", "Harassment or abusive content"
        SPAM = "spam", "Spam or advertising"
        PRIVACY = "privacy", "Personal or private information"
        OTHER = "other", "Other concern"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending review"
        REVIEWED = "reviewed", "Reviewed"
        DISMISSED = "dismissed", "Dismissed"

    post = models.ForeignKey(
        CommunityPost, on_delete=models.CASCADE, null=True, blank=True, related_name="content_reports"
    )
    reply = models.ForeignKey(
        CommunityReply, on_delete=models.CASCADE, null=True, blank=True, related_name="content_reports"
    )
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="community_content_reports"
    )
    reason = models.CharField(max_length=20, choices=Reason.choices)
    details = models.CharField(max_length=1000, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="reviewed_community_reports",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["status", "created_at"]
        constraints = [
            models.CheckConstraint(
                condition=(Q(post__isnull=False, reply__isnull=True) | Q(post__isnull=True, reply__isnull=False)),
                name="community_report_one_target",
            ),
            models.UniqueConstraint(
                fields=["post", "reporter"], condition=Q(post__isnull=False, status="pending"),
                name="one_pending_post_report_per_user",
            ),
            models.UniqueConstraint(
                fields=["reply", "reporter"], condition=Q(reply__isnull=False, status="pending"),
                name="one_pending_reply_report_per_user",
            ),
        ]

    def clean(self):
        if bool(self.post_id) == bool(self.reply_id):
            raise ValidationError("A content report must refer to exactly one post or reply.")

    def __str__(self):
        return f"{self.get_status_display()} community report #{self.pk}"
