from decimal import Decimal

import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("farms", "0002_alter_farm_size_alter_farmplot_size"),
    ]

    operations = [
        migrations.AddField(
            model_name="farmplot",
            name="soil_ph",
            field=models.DecimalField(
                blank=True,
                decimal_places=1,
                max_digits=3,
                null=True,
                validators=[
                    django.core.validators.MinValueValidator(Decimal("0")),
                    django.core.validators.MaxValueValidator(Decimal("14")),
                ],
            ),
        ),
    ]
