import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("farms", "0003_farmplot_soil_ph"),
    ]

    operations = [
        migrations.CreateModel(
            name="FarmNote",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("title", models.CharField(max_length=180)),
                ("detail", models.TextField(blank=True)),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("crop", "Crop"),
                            ("dairy", "Livestock"),
                            ("soil", "Soil"),
                            ("report", "Report"),
                            ("market", "Market"),
                        ],
                        default="crop",
                        max_length=16,
                    ),
                ),
                ("note_date", models.DateField(default=django.utils.timezone.localdate)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "author",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="farm_notes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "farm",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="notes",
                        to="farms.farm",
                    ),
                ),
            ],
            options={
                "ordering": ["-note_date", "-id"],
            },
        ),
    ]
