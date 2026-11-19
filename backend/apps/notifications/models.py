from django.conf import settings
from django.db import models


class Notification(models.Model):
    class Type(models.TextChoices):
        REPORT = "report", "Report"
        CROP = "crop", "Crop"
        LIVESTOCK = "livestock", "Livestock"
        REMINDER = "reminder", "Reminder"
        COMMUNITY = "community", "Community"

    class Severity(models.TextChoices):
        INFO = "info", "Information"
        WARNING = "warning", "Warning"
        DANGER = "danger", "Urgent"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    event_key = models.CharField(max_length=180)
    notification_type = models.CharField(max_length=16, choices=Type.choices)
    severity = models.CharField(
        max_length=12, choices=Severity.choices, default=Severity.INFO
    )
    title = models.CharField(max_length=200)
    message = models.TextField()
    action_url = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.UniqueConstraint(
                fields=["recipient", "event_key"],
                name="unique_notification_recipient_event",
            )
        ]
        indexes = [
            models.Index(fields=["recipient", "read_at", "-created_at"]),
        ]

    @property
    def is_read(self):
        return self.read_at is not None

    def __str__(self):
        return f"{self.title} ({self.recipient_id})"
