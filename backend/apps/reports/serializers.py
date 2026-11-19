from rest_framework import serializers

from apps.accounts.models import User
from apps.common.media import PrivateImageField
from apps.crops.models import Crop
from apps.farms.models import Farm, FarmPlot
from apps.livestock.models import Animal, LivestockGroup
from apps.reports.models import (
    AgriculturalReport,
    CaseAssignment,
    ReportEvidence,
    ReportUpdate,
)
from apps.reports.permissions import HANDLER_ROLES
from apps.reports.services import create_report


class ReportCreateSerializer(serializers.ModelSerializer):
    farm = serializers.PrimaryKeyRelatedField(queryset=Farm.objects.none())
    plot = serializers.PrimaryKeyRelatedField(
        queryset=FarmPlot.objects.none(), allow_null=True, required=False
    )
    crop = serializers.PrimaryKeyRelatedField(
        queryset=Crop.objects.none(), allow_null=True, required=False
    )
    livestock_group = serializers.PrimaryKeyRelatedField(
        queryset=LivestockGroup.objects.none(), allow_null=True, required=False
    )
    animal = serializers.PrimaryKeyRelatedField(
        queryset=Animal.objects.none(), allow_null=True, required=False
    )

    class Meta:
        model = AgriculturalReport
        fields = (
            "farm",
            "plot",
            "crop",
            "livestock_group",
            "animal",
            "title",
            "description",
            "category",
            "severity",
            "location_details",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            farms = Farm.objects.filter(farmer=request.user)
            self.fields["farm"].queryset = farms
            self.fields["plot"].queryset = FarmPlot.objects.filter(farm__in=farms)
            self.fields["crop"].queryset = Crop.objects.filter(farm__in=farms)
            self.fields["livestock_group"].queryset = LivestockGroup.objects.filter(farm__in=farms)
            self.fields["animal"].queryset = Animal.objects.filter(farm__in=farms)

    def validate(self, attrs):
        farm = attrs["farm"]
        plot = attrs.get("plot")
        crop = attrs.get("crop")
        group = attrs.get("livestock_group")
        animal = attrs.get("animal")

        errors = {}
        if plot and plot.farm_id != farm.pk:
            errors["plot"] = "The selected plot must belong to the selected farm."
        if crop and crop.farm_id != farm.pk:
            errors["crop"] = "The selected crop must belong to the selected farm."
        if group and group.farm_id != farm.pk:
            errors["livestock_group"] = "The selected group must belong to the selected farm."
        if animal and animal.farm_id != farm.pk:
            errors["animal"] = "The selected animal must belong to the selected farm."
        if crop and (group or animal):
            errors["crop"] = "A report cannot link crop and livestock records together."
        if group and animal and animal.group_id != group.pk:
            errors["animal"] = "The animal must belong to the selected livestock group."

        category = attrs["category"]
        has_livestock = bool(group or animal)
        crop_categories = {
            AgriculturalReport.Category.CROP_HEALTH,
            AgriculturalReport.Category.SOIL,
            AgriculturalReport.Category.WATER_IRRIGATION,
            AgriculturalReport.Category.WEATHER_CLIMATE,
            AgriculturalReport.Category.INFRASTRUCTURE,
        }
        if category in crop_categories and has_livestock:
            errors["category"] = "This report category cannot reference livestock records."
        if category == AgriculturalReport.Category.LIVESTOCK_HEALTH and crop:
            errors["crop"] = "A livestock-health report cannot reference a crop."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        return create_report(
            farmer=self.context["request"].user,
            **validated_data,
        )


class FarmerReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgriculturalReport
        fields = (
            "id",
            "report_reference",
            "farm",
            "plot",
            "crop",
            "livestock_group",
            "animal",
            "title",
            "description",
            "category",
            "severity",
            "status",
            "source",
            "location_details",
            "resolution_summary",
            "submitted_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "report_reference",
            "status",
            "source",
            "resolution_summary",
            "submitted_at",
            "updated_at",
        )


class FarmerReportEditSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgriculturalReport
        fields = ("title", "description", "severity", "location_details")


class StaffReportSerializer(FarmerReportSerializer):
    farmer_id = serializers.IntegerField(source="farmer.pk", read_only=True)
    farmer_name = serializers.SerializerMethodField()
    farmer_phone = serializers.CharField(source="farmer.phone_number", read_only=True)

    class Meta(FarmerReportSerializer.Meta):
        fields = FarmerReportSerializer.Meta.fields + (
            "farmer_id",
            "farmer_name",
            "farmer_phone",
        )

    def get_farmer_name(self, report):
        return f"{report.farmer.first_name} {report.farmer.last_name}".strip()


class UnassignedReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgriculturalReport
        fields = (
            "id",
            "report_reference",
            "farm",
            "title",
            "category",
            "severity",
            "status",
            "submitted_at",
        )
        read_only_fields = fields


class FarmerClarificationSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=10000, trim_whitespace=True)


class StaffReportUpdateSerializer(serializers.Serializer):
    update_type = serializers.ChoiceField(
        choices=[
            (value, label)
            for value, label in ReportUpdate.UpdateType.choices
            if value
            not in {
                ReportUpdate.UpdateType.FARMER_CLARIFICATION,
                ReportUpdate.UpdateType.REASSIGNMENT_NOTE,
            }
        ]
    )
    message = serializers.CharField(max_length=10000, trim_whitespace=True)
    visible_to_farmer = serializers.BooleanField(required=False, default=True)


class ReportUpdateSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = ReportUpdate
        fields = (
            "id",
            "author_name",
            "update_type",
            "message",
            "visible_to_farmer",
            "created_at",
        )
        read_only_fields = fields

    def get_author_name(self, update):
        if not update.author_id:
            return None
        return f"{update.author.first_name} {update.author.last_name}".strip()


class ReportEvidenceSerializer(serializers.ModelSerializer):
    image = PrivateImageField(resource="report-evidence")
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ReportEvidence
        fields = ("id", "image", "caption", "uploaded_by_name", "uploaded_at")
        read_only_fields = ("id", "uploaded_by_name", "uploaded_at")

    def get_uploaded_by_name(self, evidence):
        if not evidence.uploaded_by_id:
            return None
        return f"{evidence.uploaded_by.first_name} {evidence.uploaded_by.last_name}".strip()


class CaseAssignmentCreateSerializer(serializers.Serializer):
    assigned_user = serializers.PrimaryKeyRelatedField(queryset=User.objects.none())
    reason = serializers.CharField(max_length=1000, trim_whitespace=True)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["assigned_user"].queryset = User.objects.filter(
            role__in=HANDLER_ROLES,
            is_active=True,
            account_status=User.AccountStatus.ACTIVE,
        )


class CaseAssignmentSerializer(serializers.ModelSerializer):
    assigned_user_name = serializers.SerializerMethodField()
    assigned_by_name = serializers.SerializerMethodField()

    class Meta:
        model = CaseAssignment
        fields = (
            "id",
            "assigned_user",
            "assigned_user_name",
            "assigned_by",
            "assigned_by_name",
            "assignment_role",
            "assigned_at",
            "reason",
            "is_active",
            "ended_at",
            "end_reason",
        )
        read_only_fields = fields

    def get_assigned_user_name(self, assignment):
        return (
            f"{assignment.assigned_user.first_name} {assignment.assigned_user.last_name}".strip()
        )

    def get_assigned_by_name(self, assignment):
        return f"{assignment.assigned_by.first_name} {assignment.assigned_by.last_name}".strip()


class ReportTransitionSerializer(serializers.Serializer):
    new_status = serializers.ChoiceField(choices=AgriculturalReport.Status.choices)
    reason = serializers.CharField(max_length=1000, trim_whitespace=True)

    def validate_reason(self, value):
        if not value.strip():
            raise serializers.ValidationError("A reason is required.")
        return value


class ReportReopenSerializer(serializers.Serializer):
    reason = serializers.CharField(max_length=1000, trim_whitespace=True)

    def validate_reason(self, value):
        if not value.strip():
            raise serializers.ValidationError("A reason is required.")
        return value


class ReportListFilterSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=AgriculturalReport.Status.choices, required=False)
    category = serializers.ChoiceField(choices=AgriculturalReport.Category.choices, required=False)
    severity = serializers.ChoiceField(choices=AgriculturalReport.Severity.choices, required=False)
    submitted_after = serializers.DateField(required=False)
    submitted_before = serializers.DateField(required=False)

    def validate(self, attrs):
        if (
            attrs.get("submitted_after")
            and attrs.get("submitted_before")
            and attrs["submitted_after"] > attrs["submitted_before"]
        ):
            raise serializers.ValidationError(
                {"submitted_before": "This date must not precede submitted_after."}
            )
        return attrs


class ReportFilterMixin:
    def apply_report_filters(self, queryset):
        serializer = ReportListFilterSerializer(data=self.request.query_params)
        serializer.is_valid(raise_exception=True)
        filters = serializer.validated_data
        for field in ("status", "category", "severity"):
            if field in filters:
                queryset = queryset.filter(**{field: filters[field]})
        if "submitted_after" in filters:
            queryset = queryset.filter(submitted_at__date__gte=filters["submitted_after"])
        if "submitted_before" in filters:
            queryset = queryset.filter(submitted_at__date__lte=filters["submitted_before"])
        return queryset
