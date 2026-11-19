from django.db import migrations


DEFAULT_STAGES = [
    ("Land preparation", 10),
    ("Planting", 20),
    ("Germination", 30),
    ("Seedling", 40),
    ("Vegetative growth", 50),
    ("Flowering", 60),
    ("Fruiting", 70),
    ("Grain filling", 80),
    ("Maturity", 90),
    ("Harvested", 100),
]


def add_default_stages(apps, schema_editor):
    stage_model = apps.get_model("crops", "CropGrowthStage")
    stage_model.objects.using(schema_editor.connection.alias).bulk_create(
        [
            stage_model(name=name, order=order, is_active=True)
            for name, order in DEFAULT_STAGES
        ],
        ignore_conflicts=True,
    )


class Migration(migrations.Migration):
    dependencies = [
        ("crops", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(add_default_stages, migrations.RunPython.noop),
    ]
