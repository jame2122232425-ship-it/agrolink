from rest_framework import serializers

from apps.farms.models import Farm, FarmNote, FarmPlot


class FarmNoteSerializer(serializers.ModelSerializer):
    farm = serializers.PrimaryKeyRelatedField(read_only=True)
    author = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = FarmNote
        fields = (
            "id",
            "farm",
            "author",
            "title",
            "detail",
            "category",
            "note_date",
            "created_at",
        )
        read_only_fields = ("id", "farm", "author", "created_at")


class FarmPlotSerializer(serializers.ModelSerializer):
    farm = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = FarmPlot
        fields = (
            "id",
            "farm",
            "name",
            "size",
            "soil_type",
            "soil_ph",
            "irrigation_enabled",
            "description",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "farm", "created_at", "updated_at")


class FarmSerializer(serializers.ModelSerializer):
    farmer = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Farm
        fields = (
            "id",
            "farmer",
            "name",
            "location",
            "county",
            "sub_county",
            "ward",
            "village",
            "size",
            "size_unit",
            "farming_type",
            "description",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "farmer", "created_at", "updated_at")
