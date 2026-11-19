from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from apps.accounts.models import FarmerProfile, User
from apps.common.media import PrivateImageField


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "role",
            "account_status",
            "date_joined",
        )
        read_only_fields = fields


class FarmerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    profile_picture = PrivateImageField(
        resource="profile-picture",
        required=False,
        allow_null=True,
    )

    class Meta:
        model = FarmerProfile
        fields = (
            "id",
            "user",
            "county",
            "sub_county",
            "ward",
            "village",
            "preferred_language",
            "contact_phone",
            "profile_information",
            "profile_picture",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "user", "created_at", "updated_at")


class FarmerProfileRegistrationSerializer(serializers.ModelSerializer):
    county = serializers.CharField(max_length=100, allow_blank=False)

    class Meta:
        model = FarmerProfile
        fields = (
            "county",
            "sub_county",
            "ward",
            "village",
            "preferred_language",
            "contact_phone",
            "profile_information",
        )


class RegistrationSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=32, allow_blank=False)
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    password_confirm = serializers.CharField(write_only=True, trim_whitespace=False)
    farmer_profile = FarmerProfileRegistrationSerializer(required=True)

    def validate(self, attrs):
        privileged_fields = {"role", "account_status", "is_staff", "is_superuser"}
        supplied_fields = privileged_fields.intersection(self.initial_data)
        if supplied_fields:
            raise serializers.ValidationError(
                {field: "This field cannot be set during public registration." for field in supplied_fields}
            )

        attrs["email"] = attrs["email"].strip().lower()
        if User.objects.filter(email__iexact=attrs["email"]).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})

        candidate = User(
            email=attrs["email"],
            first_name=attrs["first_name"],
            last_name=attrs["last_name"],
        )
        try:
            validate_password(attrs["password"], user=candidate)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": exc.messages}) from exc
        return attrs

    def create(self, validated_data):
        profile_data = validated_data.pop("farmer_profile", {})
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User.objects.create_user(
            password=password,
            role=User.Role.FARMER,
            account_status=User.AccountStatus.ACTIVE,
            **validated_data,
        )
        FarmerProfile.objects.create(user=user, **profile_data)
        return user


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()
