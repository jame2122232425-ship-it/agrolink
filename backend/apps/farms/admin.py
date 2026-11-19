from django.contrib import admin

from apps.farms.models import Farm, FarmPlot


class FarmPlotInline(admin.TabularInline):
    model = FarmPlot
    extra = 0


@admin.register(Farm)
class FarmAdmin(admin.ModelAdmin):
    list_display = ("name", "farmer", "county", "size", "size_unit", "farming_type", "created_at")
    list_filter = ("county", "farming_type", "size_unit")
    search_fields = ("name", "farmer__email", "farmer__first_name", "farmer__last_name", "county")
    autocomplete_fields = ("farmer",)
    inlines = (FarmPlotInline,)


@admin.register(FarmPlot)
class FarmPlotAdmin(admin.ModelAdmin):
    list_display = ("name", "farm", "size", "soil_type", "irrigation_enabled")
    list_filter = ("soil_type", "irrigation_enabled")
    search_fields = ("name", "farm__name", "farm__farmer__email")
    autocomplete_fields = ("farm",)
