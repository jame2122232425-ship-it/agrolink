from django.utils import timezone
from rest_framework import serializers

from apps.common.media import PrivateImageField
from apps.farms.models import Farm, FarmPlot
from apps.crops.models import Crop, CropActivity, CropGrowthStage, CropHealthObservation


class CropGrowthStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = CropGrowthStage
        fields = ("id", "name", "order")
        read_only_fields = fields


class CropSerializer(serializers.ModelSerializer):
    farm = serializers.PrimaryKeyRelatedField(queryset=Farm.objects.none())
    plot = serializers.PrimaryKeyRelatedField(
        queryset=FarmPlot.objects.none(), allow_null=True, required=False
    )
    plot_name = serializers.SerializerMethodField()
    growth_stage = serializers.PrimaryKeyRelatedField(
        queryset=CropGrowthStage.objects.filter(is_active=True),
        allow_null=True,
        required=False,
    )
    growth_stage_name = serializers.SerializerMethodField()
    image = PrivateImageField(resource="crop", required=False, allow_null=True)

    class Meta:
        model = Crop
        fields = (
            "id",
            "farm",
            "plot",
            "plot_name",
            "crop_name",
            "variety",
            "planting_date",
            "expected_harvest_date",
            "actual_harvest_date",
            "area_planted",
            "area_unit",
            "planting_method",
            "growth_stage",
            "growth_stage_name",
            "status",
            "notes",
            "image",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            farms = Farm.objects.filter(farmer=request.user)
            self.fields["farm"].queryset = farms
            self.fields["plot"].queryset = FarmPlot.objects.filter(farm__in=farms)

    def validate(self, attrs):
        farm = attrs.get("farm", getattr(self.instance, "farm", None))
        plot = attrs.get("plot", getattr(self.instance, "plot", None))
        if plot and farm and plot.farm_id != farm.pk:
            raise serializers.ValidationError(
                {"plot": "The selected plot must belong to the selected farm."}
            )
        planting_date = attrs.get("planting_date", getattr(self.instance, "planting_date", None))
        expected = attrs.get(
            "expected_harvest_date", getattr(self.instance, "expected_harvest_date", None)
        )
        actual = attrs.get(
            "actual_harvest_date", getattr(self.instance, "actual_harvest_date", None)
        )
        if planting_date and expected and expected < planting_date:
            raise serializers.ValidationError(
                {"expected_harvest_date": "Expected harvest cannot precede planting."}
            )
        if planting_date and actual and actual < planting_date:
            raise serializers.ValidationError(
                {"actual_harvest_date": "Actual harvest cannot precede planting."}
            )
        return attrs

    def get_plot_name(self, crop):
        return crop.plot.name if crop.plot_id else None

    def get_growth_stage_name(self, crop):
        return crop.growth_stage.name if crop.growth_stage_id else None


class CropHealthObservationSerializer(serializers.ModelSerializer):
    crop = serializers.PrimaryKeyRelatedField(queryset=Crop.objects.none())
    recorded_by = serializers.PrimaryKeyRelatedField(read_only=True)
    image = PrivateImageField(
        resource="crop-observation", required=False, allow_null=True
    )

    class Meta:
        model = CropHealthObservation
        fields = (
            "id",
            "crop",
            "observation_date",
            "symptoms_observed",
            "general_condition",
            "severity",
            "notes",
            "image",
            "recorded_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "recorded_by", "created_at", "updated_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["crop"].queryset = Crop.objects.filter(farm__farmer=request.user)

    def validate_observation_date(self, value):
        if value > timezone.localdate():
            raise serializers.ValidationError("Observation date cannot be in the future.")
        return value


class CropActivitySerializer(serializers.ModelSerializer):
    crop = serializers.PrimaryKeyRelatedField(queryset=Crop.objects.none())
    recorded_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = CropActivity
        fields = (
            "id",
            "crop",
            "activity_type",
            "activity_date",
            "description",
            "product_or_treatment",
            "quantity",
            "unit",
            "recorded_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "recorded_by", "created_at", "updated_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            self.fields["crop"].queryset = Crop.objects.filter(farm__farmer=request.user)
