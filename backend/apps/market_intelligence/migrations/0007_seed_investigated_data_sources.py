from django.db import migrations


SOURCES = (
    {
        "name": "Kenya Agricultural Market Information System",
        "slug": "kamis",
        "source_type": "official",
        "url": "https://kamis.kilimo.go.ke/",
        "attribution": "Kenya Ministry of Agriculture and Livestock Development",
        "description": "Public market-price pages and an Excel export link were found; no documented public API or republication permission was confirmed.",
        "data_type": "Crop and livestock market-price information",
        "coverage": "Market-specific coverage; county coverage must be measured from imported observations",
        "access_method": "Public website and advertised Excel export",
        "update_frequency": "Not confirmed",
        "usage_terms": "Obtain written authorization before importing or redistributing exported data.",
        "data_use_authorized": False,
        "integration_status": "awaiting_authorization",
    },
    {
        "name": "Kenya Livestock Marketing Council",
        "slug": "kenya-livestock-marketing-council",
        "source_type": "organization",
        "url": "https://livestockcouncil.or.ke/",
        "attribution": "Kenya Livestock Marketing Council",
        "description": "The public site presented bot verification during investigation; no data was accessed or bypassed.",
        "data_type": "Livestock market publications and reports (availability not verified)",
        "coverage": "Kenya (dataset coverage not verified)",
        "access_method": "Website access requires confirmation from the organization",
        "update_frequency": "Not confirmed",
        "usage_terms": "Confirm data availability, access terms, and republication permission with the organization.",
        "data_use_authorized": False,
        "integration_status": "investigated",
    },
    {
        "name": "FEWS NET Kenya",
        "slug": "fews-net-kenya",
        "source_type": "organization",
        "url": "https://fews.net/east-africa/kenya",
        "attribution": "FEWS NET",
        "description": "Kenya reporting includes market-price resources and analysis; the Data Explorer requires an account for downloads or API extraction.",
        "data_type": "Commodity price datasets and food-security analysis",
        "coverage": "Kenya and FEWS NET reporting geographies; dataset-specific",
        "access_method": "Data Explorer download/API access; account required",
        "update_frequency": "Dataset-specific",
        "usage_terms": "Review the selected dataset's terms and access requirements before reuse.",
        "data_use_authorized": False,
        "integration_status": "awaiting_authorization",
    },
    {
        "name": "Kenya National Drought Management Authority",
        "slug": "ndma-kenya",
        "source_type": "official",
        "url": "https://ndma.go.ke/",
        "attribution": "National Drought Management Authority",
        "description": "Public pages link national and county drought and seasonal-assessment bulletins; actual price datasets were not confirmed.",
        "data_type": "Drought and food-security bulletins; price fields unverified",
        "coverage": "National and county bulletin coverage; report-specific",
        "access_method": "Public reports and KnowledgeWeb resources",
        "update_frequency": "Report-specific",
        "usage_terms": "Confirm reuse terms for each report before extracting or redistributing information.",
        "data_use_authorized": False,
        "integration_status": "investigated",
    },
    {
        "name": "Kenya Agricultural and Livestock Research Organization",
        "slug": "kalro-kaop",
        "source_type": "official",
        "url": "https://kalro.org/",
        "attribution": "Kenya Agricultural and Livestock Research Organization",
        "description": "KALRO links agricultural knowledge and the Kenya Agricultural Observatory Platform; no supported price feed was verified.",
        "data_type": "Agricultural research and observation context; market prices not verified",
        "coverage": "Research and observatory products are dataset-specific",
        "access_method": "Public information pages; dataset/API access not confirmed",
        "update_frequency": "Dataset-specific",
        "usage_terms": "Confirm dataset-specific access and reuse terms before using data.",
        "data_use_authorized": False,
        "integration_status": "investigated",
    },
)


def seed_sources(apps, schema_editor):
    PriceSource = apps.get_model("market_intelligence", "PriceSource")
    for source in SOURCES:
        PriceSource.objects.get_or_create(slug=source["slug"], defaults=source)


def remove_seed_sources(apps, schema_editor):
    PriceSource = apps.get_model("market_intelligence", "PriceSource")
    for source in SOURCES:
        PriceSource.objects.filter(
            slug=source["slug"],
            price_observations__isnull=True,
            submissions__isnull=True,
        ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("market_intelligence", "0006_marketpriceobservation_source_reference_and_more"),
    ]

    operations = [
        migrations.RunPython(seed_sources, remove_seed_sources),
    ]
