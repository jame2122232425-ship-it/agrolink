from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class AdminAuditEventQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValidationError("Administrative audit events are append-only.")

    def delete(self):
        raise ValidationError("Administrative audit events are append-only.")


class AdminAuditEvent(models.Model):
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="platform_admin_events",
        null=True,
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="platform_admin_events_as_target",
        null=True,
        blank=True,
    )
    action = models.CharField(max_length=80)
    resource_type = models.CharField(max_length=80)
    resource_id = models.CharField(max_length=80, blank=True)
    reason = models.TextField(blank=True)
    changes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = AdminAuditEventQuerySet.as_manager()

    class Meta:
        ordering = ["-created_at", "-pk"]

    def save(self, *args, **kwargs):
        if self.pk and type(self).objects.filter(pk=self.pk).exists():
            raise ValidationError("Administrative audit events are append-only.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Administrative audit events are append-only.")

    def __str__(self):
        return f"{self.action} {self.resource_type} {self.resource_id}".strip()

    @property
    def display_action(self):
        return self.action.replace("_", " ").capitalize()
