from django.db import migrations
from django.utils.text import slugify


COUNTIES = [
    "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita Taveta", "Garissa",
    "Wajir", "Mandera", "Marsabit", "Isiolo", "Meru", "Tharaka-Nithi", "Embu",
    "Kitui", "Machakos", "Makueni", "Nyandarua", "Nyeri", "Kirinyaga", "Murang'a",
    "Kiambu", "Turkana", "West Pokot", "Samburu", "Trans Nzoia", "Uasin Gishu",
    "Elgeyo-Marakwet", "Nandi", "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado",
    "Kericho", "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", "Kisumu",
    "Homa Bay", "Migori", "Kisii", "Nyamira", "Nairobi City",
]

UNITS = [
    ("Kilogram", "kilogram", "kg", "mass", "kg", "1", "Standard kilogram"),
    ("Gram", "gram", "g", "mass", "kg", "0.001", "One thousandth of a kilogram"),
    ("Tonne", "tonne", "t", "mass", "kg", "1000", "Metric tonne"),
    ("50-kilogram bag", "50-kilogram-bag", "50 kg bag", "container", "kg", "50", "Standard 50 kg bag"),
    ("90-kilogram bag", "90-kilogram-bag", "90 kg bag", "container", "kg", "90", "Standard 90 kg bag"),
    ("100-kilogram bag", "100-kilogram-bag", "100 kg bag", "container", "kg", "100", "Standard 100 kg bag"),
    ("Litre", "litre", "L", "volume", "L", "1", "Standard litre"),
    ("Egg", "egg", "egg", "count", "egg", "1", "Single egg"),
    ("Tray of 30 eggs", "tray-of-30-eggs", "tray (30)", "container", "egg", "30", "Tray containing 30 eggs"),
    ("Piece", "piece", "piece", "count", "piece", "1", "Single individual item"),
    ("Colony", "colony", "colony", "count", "colony", "1", "One bee colony"),
    ("Live animal", "live-animal", "animal", "count", "head", "1", "Price for one live animal"),
    ("Crate", "crate", "crate", "container", "", None, "Container size varies; state the quantity"),
    ("Basket", "basket", "basket", "container", "", None, "Container size varies; state the quantity"),
    ("Bunch", "bunch", "bunch", "count", "", None, "Bunch size varies; state the quantity"),
]

CATEGORIES = [
    ("crop", "Cereals and grains", "cereals-and-grains", 10),
    ("crop", "Legumes and pulses", "legumes-and-pulses", 20),
    ("crop", "Root and tuber crops", "root-and-tuber-crops", 30),
    ("crop", "Vegetables", "vegetables", 40),
    ("crop", "Fruits", "fruits", 50),
    ("crop", "Cash and industrial crops", "cash-and-industrial-crops", 60),
    ("crop", "Oilseed crops", "oilseed-crops", 70),
    ("crop", "Horticultural and export crops", "horticultural-and-export-crops", 80),
    ("crop", "Herbs, spices and medicinal crops", "herbs-spices-and-medicinal-crops", 90),
    ("crop", "Fodder and forage crops", "fodder-and-forage-crops", 100),
    ("crop", "Other agricultural crops", "other-agricultural-crops", 110),
    ("livestock", "Cattle and beef", "cattle-and-beef", 10),
    ("livestock", "Dairy", "dairy", 20),
    ("livestock", "Small ruminants", "small-ruminants", 30),
    ("livestock", "Poultry and eggs", "poultry-and-eggs", 40),
    ("livestock", "Pigs", "pigs", 50),
    ("livestock", "Apiculture", "apiculture", 60),
    ("livestock", "Aquaculture", "aquaculture", 70),
    ("livestock", "Other farmed livestock", "other-farmed-livestock", 80),
]

COMMODITIES = [
    ("crop", "Maize", "cereals-and-grains", "", ["maize", "corn"], ["kilogram", "50-kilogram-bag", "90-kilogram-bag", "100-kilogram-bag"]),
    ("crop", "Rice", "cereals-and-grains", "", [], ["kilogram", "50-kilogram-bag"]),
    ("crop", "Sorghum", "cereals-and-grains", "", [], ["kilogram", "50-kilogram-bag"]),
    ("crop", "Millet", "cereals-and-grains", "", ["finger millet"], ["kilogram", "50-kilogram-bag"]),
    ("crop", "Wheat", "cereals-and-grains", "", [], ["kilogram", "50-kilogram-bag"]),
    ("crop", "Beans", "legumes-and-pulses", "", [], ["kilogram", "50-kilogram-bag", "90-kilogram-bag"]),
    ("crop", "Rosecoco beans", "legumes-and-pulses", "", ["rose coco"], ["kilogram", "50-kilogram-bag", "90-kilogram-bag"]),
    ("crop", "Green grams", "legumes-and-pulses", "", ["mung beans"], ["kilogram", "50-kilogram-bag"]),
    ("crop", "Cowpeas", "legumes-and-pulses", "", [], ["kilogram", "50-kilogram-bag"]),
    ("crop", "Pigeon peas", "legumes-and-pulses", "", [], ["kilogram", "50-kilogram-bag"]),
    ("crop", "Groundnuts", "legumes-and-pulses", "", ["peanuts"], ["kilogram", "50-kilogram-bag"]),
    ("crop", "Irish potatoes", "root-and-tuber-crops", "", ["potatoes"], ["kilogram", "50-kilogram-bag", "basket"]),
    ("crop", "Sweet potatoes", "root-and-tuber-crops", "", [], ["kilogram", "basket"]),
    ("crop", "Cassava", "root-and-tuber-crops", "", [], ["kilogram", "basket"]),
    ("crop", "Arrowroot", "root-and-tuber-crops", "", [], ["kilogram", "basket"]),
    ("crop", "Tomatoes", "vegetables", "", [], ["kilogram", "crate", "basket"]),
    ("crop", "Onions", "vegetables", "", [], ["kilogram", "crate", "basket"]),
    ("crop", "Kale", "vegetables", "", ["sukuma wiki"], ["kilogram", "bunch"]),
    ("crop", "Cabbage", "vegetables", "", [], ["kilogram", "piece"]),
    ("crop", "Spinach", "vegetables", "", [], ["kilogram", "bunch"]),
    ("crop", "Bananas", "fruits", "", [], ["kilogram", "bunch"]),
    ("crop", "Mangoes", "fruits", "", [], ["kilogram", "basket"]),
    ("crop", "Avocado", "fruits", "", [], ["kilogram", "basket"]),
    ("crop", "Oranges", "fruits", "", [], ["kilogram", "basket"]),
    ("crop", "Macadamia", "horticultural-and-export-crops", "", [], ["kilogram"]),
    ("crop", "Tea leaves", "cash-and-industrial-crops", "", ["green leaf tea"], ["kilogram"]),
    ("crop", "Coffee cherries", "cash-and-industrial-crops", "", [], ["kilogram"]),
    ("crop", "Sugarcane", "cash-and-industrial-crops", "", [], ["kilogram", "tonne"]),
    ("crop", "Sunflower", "oilseed-crops", "", [], ["kilogram", "50-kilogram-bag"]),
    ("crop", "Ginger", "herbs-spices-and-medicinal-crops", "", [], ["kilogram"]),
    ("crop", "Garlic", "herbs-spices-and-medicinal-crops", "", [], ["kilogram"]),
    ("crop", "Chillies", "herbs-spices-and-medicinal-crops", "", ["chili peppers"], ["kilogram"]),
    ("crop", "Napier grass", "fodder-and-forage-crops", "", ["elephant grass"], ["kilogram", "tonne"]),
    ("crop", "Lucerne", "fodder-and-forage-crops", "", ["alfalfa"], ["kilogram", "tonne"]),
    ("crop", "Other crop", "other-agricultural-crops", "", [], ["kilogram"]),
    ("livestock", "Live cattle", "cattle-and-beef", "per_animal", ["cow", "bull", "steer"], ["live-animal"]),
    ("livestock", "Calf", "cattle-and-beef", "per_animal", [], ["live-animal"]),
    ("livestock", "Mature cattle", "cattle-and-beef", "per_animal", [], ["live-animal"]),
    ("livestock", "Bull", "cattle-and-beef", "per_animal", [], ["live-animal"]),
    ("livestock", "Dairy cow", "dairy", "per_animal", [], ["live-animal"]),
    ("livestock", "Beef", "cattle-and-beef", "meat_weight", [], ["kilogram"]),
    ("livestock", "Cow milk", "dairy", "milk_volume", ["milk"], ["litre"]),
    ("livestock", "Goat", "small-ruminants", "per_animal", [], ["live-animal"]),
    ("livestock", "Sheep", "small-ruminants", "per_animal", [], ["live-animal"]),
    ("livestock", "Chicken", "poultry-and-eggs", "per_animal", ["indigenous chicken", "broiler"], ["live-animal"]),
    ("livestock", "Duck", "poultry-and-eggs", "per_animal", [], ["live-animal"]),
    ("livestock", "Turkey", "poultry-and-eggs", "per_animal", [], ["live-animal"]),
    ("livestock", "Goose", "poultry-and-eggs", "per_animal", [], ["live-animal"]),
    ("livestock", "Eggs", "poultry-and-eggs", "egg_count", [], ["egg", "tray-of-30-eggs"]),
    ("livestock", "Pig", "pigs", "per_animal", [], ["live-animal"]),
    ("livestock", "Pork", "pigs", "meat_weight", [], ["kilogram"]),
    ("livestock", "Honey", "apiculture", "honey_weight", [], ["kilogram"]),
    ("livestock", "Bee colony", "apiculture", "per_animal", [], ["colony"]),
    ("livestock", "Fish", "aquaculture", "meat_weight", [], ["kilogram"]),
    ("livestock", "Rabbit", "other-farmed-livestock", "per_animal", [], ["live-animal"]),
    ("livestock", "Camel", "other-farmed-livestock", "per_animal", [], ["live-animal"]),
    ("livestock", "Donkey", "other-farmed-livestock", "per_animal", [], ["live-animal"]),
    ("livestock", "Other farmed livestock", "other-farmed-livestock", "other", [], ["live-animal"]),
]


def seed_reference_data(apps, schema_editor):
    CommodityCategory = apps.get_model("market_intelligence", "CommodityCategory")
    AgriculturalCommodity = apps.get_model("market_intelligence", "AgriculturalCommodity")
    County = apps.get_model("market_intelligence", "County")
    PriceSource = apps.get_model("market_intelligence", "PriceSource")
    TradingUnit = apps.get_model("market_intelligence", "TradingUnit")

    for code, name in enumerate(COUNTIES, start=1):
        County.objects.get_or_create(
            code=f"{code:03d}",
            defaults={"name": name, "slug": slugify(name)},
        )

    units = {}
    for name, slug, abbreviation, measure_kind, base_unit, quantity, description in UNITS:
        unit, _ = TradingUnit.objects.get_or_create(
            slug=slug,
            defaults={
                "name": name,
                "abbreviation": abbreviation,
                "measure_kind": measure_kind,
                "base_unit": base_unit,
                "quantity_in_base": quantity,
                "description": description,
            },
        )
        units[slug] = unit

    categories = {}
    for kind, name, slug, sort_order in CATEGORIES:
        category, _ = CommodityCategory.objects.get_or_create(
            kind=kind,
            slug=slug,
            defaults={"name": name, "sort_order": sort_order},
        )
        categories[slug] = category

    for kind, name, category_slug, price_basis, aliases, unit_slugs in COMMODITIES:
        commodity, _ = AgriculturalCommodity.objects.get_or_create(
            kind=kind,
            slug=slugify(name),
            defaults={
                "category": categories[category_slug],
                "name": name,
                "alternative_names": aliases,
                "price_basis": price_basis,
            },
        )
        commodity.supported_units.set([units[slug] for slug in unit_slugs])

    PriceSource.objects.get_or_create(
        slug="community-submission",
        defaults={
            "name": "Farmer and field-agent submissions",
            "source_type": "community",
            "attribution": "Community reports, pending verification",
            "description": "Individual submissions are not public until reviewed and verified.",
        },
    )


class Migration(migrations.Migration):
    dependencies = [
        ("market_intelligence", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_reference_data, migrations.RunPython.noop),
    ]
