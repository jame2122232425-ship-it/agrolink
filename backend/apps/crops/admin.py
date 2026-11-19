from django.contrib import admin

from apps.crops.models import (
    Crop,
    CropActivity,
    CropAssessment,
    CropGrowthStage,
    CropHealthObservation,
)


@admin.register(CropGrowthStage)
class CropGrowthStageAdmin(admin.ModelAdmin):
    list_display = ("name", "order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name",)
    ordering = ("order", "name")


@admin.register(Crop)
class CropAdmin(admin.ModelAdmin):
    list_display = ("crop_name", "farm", "plot", "status", "growth_stage", "planting_date")
    list_filter = ("status", "growth_stage", "area_unit")
    search_fields = ("crop_name", "variety", "farm__name", "farm__farmer__email")
    autocomplete_fields = ("farm", "plot", "growth_stage")
    exclude = ("image",)


@admin.register(CropHealthObservation)
class CropHealthObservationAdmin(admin.ModelAdmin):
    list_display = ("crop", "observation_date", "general_condition", "severity", "recorded_by")
    list_filter = ("general_condition", "severity", "observation_date")
    search_fields = ("crop__crop_name", "crop__farm__name", "symptoms_observed")
    autocomplete_fields = ("crop", "recorded_by")
    exclude = ("image",)


@admin.register(CropActivity)
class CropActivityAdmin(admin.ModelAdmin):
    list_display = ("crop", "activity_type", "activity_date", "recorded_by")
    list_filter = ("activity_type", "activity_date")
    search_fields = ("crop__crop_name", "description", "product_or_treatment")
    autocomplete_fields = ("crop", "recorded_by")


@admin.register(CropAssessment)
class CropAssessmentAdmin(admin.ModelAdmin):
    list_display = ("crop", "assessment_type", "assessed_at", "assessed_by")
    list_filter = ("assessment_type", "assessed_at")
    search_fields = ("crop__crop_name", "assessment", "diagnosis")
    autocomplete_fields = ("crop", "observation", "assessed_by")
