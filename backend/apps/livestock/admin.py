from django.contrib import admin

from apps.livestock.models import (
    Animal,
    LivestockActivity,
    LivestockAssessment,
    LivestockGroup,
    LivestockHealthObservation,
    LivestockMedicalRecord,
)


@admin.register(LivestockGroup)
class LivestockGroupAdmin(admin.ModelAdmin):
    list_display = ("group_name", "species", "farm", "animal_count", "is_active")
    list_filter = ("species", "is_active", "production_purpose")
    search_fields = ("group_name", "species", "breed", "farm__name", "farm__farmer__email")
    autocomplete_fields = ("farm",)
    exclude = ("image",)


@admin.register(Animal)
class AnimalAdmin(admin.ModelAdmin):
    list_display = ("name_or_tag", "identification_number", "species", "farm", "group", "status")
    list_filter = ("species", "sex", "status", "production_purpose")
    search_fields = (
        "name_or_tag",
        "identification_number",
        "species",
        "farm__name",
        "farm__farmer__email",
    )
    autocomplete_fields = ("farm", "group")
    exclude = ("image",)


@admin.register(LivestockHealthObservation)
class LivestockHealthObservationAdmin(admin.ModelAdmin):
    list_display = ("observation_date", "animal", "group", "severity", "recorded_by")
    list_filter = ("general_condition", "severity", "observation_date")
    search_fields = ("symptoms_reported", "farmer_notes", "animal__species", "group__species")
    autocomplete_fields = ("animal", "group", "recorded_by")
    exclude = ("image",)


@admin.register(LivestockMedicalRecord)
class LivestockMedicalRecordAdmin(admin.ModelAdmin):
    list_display = (
        "record_type",
        "product_or_vaccine",
        "animal",
        "group",
        "administration_date",
        "entry_type",
    )
    list_filter = ("record_type", "entry_type", "administration_date")
    search_fields = ("product_or_vaccine", "batch_number", "administered_by")
    autocomplete_fields = ("animal", "group", "recorded_by")


@admin.register(LivestockActivity)
class LivestockActivityAdmin(admin.ModelAdmin):
    list_display = ("activity_type", "activity_date", "animal", "group", "recorded_by")
    list_filter = ("activity_type", "activity_date")
    search_fields = ("description", "animal__species", "group__species")
    autocomplete_fields = ("animal", "group", "recorded_by")


@admin.register(LivestockAssessment)
class LivestockAssessmentAdmin(admin.ModelAdmin):
    list_display = ("assessment_type", "animal", "group", "assessed_at", "assessed_by")
    list_filter = ("assessment_type", "assessed_at")
    search_fields = ("assessment", "diagnosis")
    autocomplete_fields = ("animal", "group", "observation", "assessed_by")
