from django.utils import timezone
from rest_framework import serializers

from apps.common.media import PrivateImageField
from apps.farms.models import Farm
from apps.livestock.models import (
    Animal,
    LivestockActivity,
    LivestockGroup,
    LivestockHealthObservation,
    LivestockMedicalRecord,
)


class LivestockGroupSerializer(serializers.ModelSerializer):
    farm = serializers.PrimaryKeyRelatedField(queryset=Farm.objects.none())
    image = PrivateImageField(
        resource="livestock-group", required=False, allow_null=True
    )

    class Meta:
        model = LivestockGroup
        fields = (
            "id",
            "farm",
            "species",
            "breed",
            "group_name",
            "animal_count",
            "is_active",
            "production_purpose",
            "acquisition_date",
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
            self.fields["farm"].queryset = Farm.objects.filter(farmer=request.user)

    def validate_acquisition_date(self, value):
        if value and value > timezone.localdate():
            raise serializers.ValidationError("Acquisition date cannot be in the future.")
        return value


class AnimalSerializer(serializers.ModelSerializer):
    farm = serializers.PrimaryKeyRelatedField(queryset=Farm.objects.none())
    group = serializers.PrimaryKeyRelatedField(
        queryset=LivestockGroup.objects.none(), allow_null=True, required=False
    )
    image = PrivateImageField(
        resource="livestock-animal", required=False, allow_null=True
    )

    class Meta:
        model = Animal
        fields = (
            "id",
            "farm",
            "group",
            "identification_number",
            "name_or_tag",
            "species",
            "breed",
            "sex",
            "birth_date",
            "estimated_age_months",
            "acquisition_date",
            "production_purpose",
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
            self.fields["group"].queryset = LivestockGroup.objects.filter(farm__in=farms)

    def validate(self, attrs):
        farm = attrs.get("farm", getattr(self.instance, "farm", None))
        group = attrs.get("group", getattr(self.instance, "group", None))
        species = attrs.get("species", getattr(self.instance, "species", ""))
        birth_date = attrs.get("birth_date", getattr(self.instance, "birth_date", None))
        estimated_age = attrs.get(
            "estimated_age_months", getattr(self.instance, "estimated_age_months", None)
        )
        acquisition_date = attrs.get(
            "acquisition_date", getattr(self.instance, "acquisition_date", None)
        )
        errors = {}
        if group and farm and group.farm_id != farm.pk:
            errors["group"] = "The livestock group must belong to the selected farm."
        if group and group.species.strip().casefold() != species.strip().casefold():
            errors["species"] = "The animal species must match its group."
        identification_number = attrs.get(
            "identification_number",
            getattr(self.instance, "identification_number", ""),
        ).strip().upper()
        if identification_number:
            duplicate_ids = Animal.objects.filter(
                farm=farm,
                identification_number__iexact=identification_number,
            )
            if self.instance:
                duplicate_ids = duplicate_ids.exclude(pk=self.instance.pk)
            if duplicate_ids.exists():
                errors["identification_number"] = (
                    "This identification number is already used on this farm."
                )
            attrs["identification_number"] = identification_number
        today = timezone.localdate()
        if birth_date and birth_date > today:
            errors["birth_date"] = "Birth date cannot be in the future."
        if acquisition_date and acquisition_date > today:
            errors["acquisition_date"] = "Acquisition date cannot be in the future."
        if birth_date and acquisition_date and acquisition_date < birth_date:
            errors["acquisition_date"] = "Acquisition date cannot precede birth date."
        if birth_date and estimated_age is not None:
            errors["estimated_age_months"] = "Provide birth date or estimated age, not both."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class LivestockHealthObservationSerializer(serializers.ModelSerializer):
    animal = serializers.PrimaryKeyRelatedField(
        queryset=Animal.objects.none(), allow_null=True, required=False
    )
    group = serializers.PrimaryKeyRelatedField(
        queryset=LivestockGroup.objects.none(), allow_null=True, required=False
    )
    recorded_by = serializers.PrimaryKeyRelatedField(read_only=True)
    image = PrivateImageField(
        resource="livestock-observation", required=False, allow_null=True
    )

    class Meta:
        model = LivestockHealthObservation
        fields = (
            "id",
            "animal",
            "group",
            "observation_date",
            "symptoms_reported",
            "general_condition",
            "severity",
            "farmer_notes",
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
            farms = Farm.objects.filter(farmer=request.user)
            self.fields["animal"].queryset = Animal.objects.filter(farm__in=farms)
            self.fields["group"].queryset = LivestockGroup.objects.filter(farm__in=farms)

    def validate(self, attrs):
        animal = attrs.get("animal", getattr(self.instance, "animal", None))
        group = attrs.get("group", getattr(self.instance, "group", None))
        if bool(animal) == bool(group):
            raise serializers.ValidationError("Select exactly one animal or livestock group.")
        observation_date = attrs.get(
            "observation_date", getattr(self.instance, "observation_date", None)
        )
        if observation_date and observation_date > timezone.localdate():
            raise serializers.ValidationError(
                {"observation_date": "Observation date cannot be in the future."}
            )
        return attrs


class LivestockMedicalRecordSerializer(serializers.ModelSerializer):
    animal = serializers.PrimaryKeyRelatedField(
        queryset=Animal.objects.none(), allow_null=True, required=False
    )
    group = serializers.PrimaryKeyRelatedField(
        queryset=LivestockGroup.objects.none(), allow_null=True, required=False
    )
    recorded_by = serializers.PrimaryKeyRelatedField(read_only=True)
    entry_type = serializers.CharField(read_only=True)

    class Meta:
        model = LivestockMedicalRecord
        fields = (
            "id",
            "animal",
            "group",
            "record_type",
            "product_or_vaccine",
            "administration_date",
            "dosage",
            "dosage_unit",
            "batch_number",
            "administered_by",
            "next_scheduled_date",
            "notes",
            "entry_type",
            "recorded_by",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "entry_type", "recorded_by", "created_at", "updated_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            farms = Farm.objects.filter(farmer=request.user)
            self.fields["animal"].queryset = Animal.objects.filter(farm__in=farms)
            self.fields["group"].queryset = LivestockGroup.objects.filter(farm__in=farms)

    def validate(self, attrs):
        animal = attrs.get("animal", getattr(self.instance, "animal", None))
        group = attrs.get("group", getattr(self.instance, "group", None))
        if bool(animal) == bool(group):
            raise serializers.ValidationError("Select exactly one animal or livestock group.")
        date = attrs.get(
            "administration_date", getattr(self.instance, "administration_date", None)
        )
        next_date = attrs.get(
            "next_scheduled_date", getattr(self.instance, "next_scheduled_date", None)
        )
        if date and date > timezone.localdate():
            raise serializers.ValidationError(
                {"administration_date": "Administration date cannot be in the future."}
            )
        if date and next_date and next_date < date:
            raise serializers.ValidationError(
                {"next_scheduled_date": "Next scheduled date cannot precede administration."}
            )
        return attrs


class LivestockActivitySerializer(serializers.ModelSerializer):
    animal = serializers.PrimaryKeyRelatedField(
        queryset=Animal.objects.none(), allow_null=True, required=False
    )
    group = serializers.PrimaryKeyRelatedField(
        queryset=LivestockGroup.objects.none(), allow_null=True, required=False
    )
    recorded_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = LivestockActivity
        fields = (
            "id",
            "animal",
            "group",
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
            farms = Farm.objects.filter(farmer=request.user)
            self.fields["animal"].queryset = Animal.objects.filter(farm__in=farms)
            self.fields["group"].queryset = LivestockGroup.objects.filter(farm__in=farms)

    def validate(self, attrs):
        animal = attrs.get("animal", getattr(self.instance, "animal", None))
        group = attrs.get("group", getattr(self.instance, "group", None))
        if bool(animal) == bool(group):
            raise serializers.ValidationError("Select exactly one animal or livestock group.")
        return attrs
