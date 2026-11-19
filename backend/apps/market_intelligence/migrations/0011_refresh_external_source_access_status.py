from django.db import migrations


SOURCE_UPDATES = (
    {
        "slug": "kamis",
        "name": "Kenya Agricultural Market Information System",
        "url": "https://kamis.kilimo.go.ke/",
        "description": (
            "The public KAMIS site exposes server-rendered commodity-market price pages "
            "and a search page. No documented API, downloadable dataset, or reuse "
            "permission was confirmed during the 2026-11 review."
        ),
        "data_type": "Crop and produce commodity market prices",
        "access_method": "Public website pages; no supported API or export confirmed",
        "update_frequency": "Not confirmed",
        "usage_terms": (
            "Do not automate collection or redistribute prices until KAMIS confirms "
            "an approved access method and written data-use permission."
        ),
        "data_use_authorized": False,
        "integration_status": "awaiting_authorization",
    },
    {
        "slug": "kenya-livestock-marketing-council",
        "name": "Kenya Livestock Marketing Council",
        "url": "https://livestockcouncil.or.ke/",
        "description": (
            "The public website is accessible and describes KLMC livestock-marketing "
            "programs and publications, but no price dataset, supported API, or "
            "downloadable price export was identified during the 2026-11 review."
        ),
        "data_type": "Livestock market information; price dataset not confirmed",
        "access_method": "Public website; contact KLMC for an approved data feed or export",
        "update_frequency": "Not confirmed",
        "usage_terms": (
            "Confirm a supported price dataset and written access and republication "
            "permission with KLMC before importing."
        ),
        "data_use_authorized": False,
        "integration_status": "awaiting_authorization",
    },
    {
        "slug": "kalro-kaop",
        "name": "Kenya Agricultural Observatory Platform",
        "url": "https://kenya.agdatahub.ilri.org/dashboard.html",
        "attribution": "Kenya Agricultural Observatory Platform; hosted at ILRI AgDataHub",
        "description": (
            "The public dashboard displays market-information tables, including "
            "livestock labels, with an example observation dated 2023-06-05. No "
            "supported API, downloadable price dataset, current livestock price "
            "coverage, or reuse terms were confirmed during the 2026-11 review."
        ),
        "data_type": "Agricultural observation and market information; price feed not confirmed",
        "access_method": "Public dashboard; request dataset/API and reuse terms from platform owners",
        "update_frequency": "Not confirmed",
        "usage_terms": (
            "Do not automate extraction or redistribute dashboard data until the "
            "platform owners confirm a supported method and written data-use permission."
        ),
        "data_use_authorized": False,
        "integration_status": "awaiting_authorization",
    },
)


def refresh_source_metadata(apps, schema_editor):
    PriceSource = apps.get_model("market_intelligence", "PriceSource")
    for fields in SOURCE_UPDATES:
        PriceSource.objects.filter(slug=fields["slug"]).update(**fields)


def restore_prior_source_metadata(apps, schema_editor):
    PriceSource = apps.get_model("market_intelligence", "PriceSource")
    PriceSource.objects.filter(slug="kamis").update(
        name="Kenya Agricultural Market Information System",
        url="https://kamis.kilimo.go.ke/",
        attribution="Kenya Ministry of Agriculture and Livestock Development",
        description=(
            "Public market-price pages and an Excel export link were found; no "
            "documented public API or republication permission was confirmed."
        ),
        data_type="Crop and livestock market-price information",
        access_method="Public website and advertised Excel export",
        update_frequency="Not confirmed",
        usage_terms="Obtain written authorization before importing or redistributing exported data.",
        data_use_authorized=False,
        integration_status="awaiting_authorization",
    )
    PriceSource.objects.filter(slug="kenya-livestock-marketing-council").update(
        name="Kenya Livestock Marketing Council",
        url="https://livestockcouncil.or.ke/",
        attribution="Kenya Livestock Marketing Council",
        description=(
            "The public site presented bot verification during investigation; "
            "no data was accessed or bypassed."
        ),
        data_type="Livestock market publications and reports (availability not verified)",
        access_method="Website access requires confirmation from the organization",
        update_frequency="Not confirmed",
        usage_terms="Confirm data availability, access terms, and republication permission with the organization.",
        data_use_authorized=False,
        integration_status="investigated",
    )
    PriceSource.objects.filter(slug="kalro-kaop").update(
        name="Kenya Agricultural and Livestock Research Organization",
        url="https://kalro.org/",
        attribution="Kenya Agricultural and Livestock Research Organization",
        description=(
            "KALRO links agricultural knowledge and the Kenya Agricultural "
            "Observatory Platform; no supported price feed was verified."
        ),
        data_type="Agricultural research and observation context; market prices not verified",
        access_method="Public information pages; dataset/API access not confirmed",
        update_frequency="Dataset-specific",
        usage_terms="Confirm dataset-specific access and reuse terms before using data.",
        data_use_authorized=False,
        integration_status="investigated",
    )


class Migration(migrations.Migration):
    dependencies = [
        ("market_intelligence", "0010_farmermarketwatch"),
    ]

    operations = [
        migrations.RunPython(refresh_source_metadata, restore_prior_source_metadata),
    ]
