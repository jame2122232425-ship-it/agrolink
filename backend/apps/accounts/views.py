from django.db import transaction
from rest_framework import generics, status
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.serializers import (
    FarmerProfileSerializer,
    LogoutSerializer,
    RegistrationSerializer,
    UserSerializer,
)
from apps.accounts.models import User
from apps.common.permissions import IsActiveAccount


class RegisterView(generics.CreateAPIView):
    serializer_class = RegistrationSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        refresh_token = serializer.validated_data["refresh"]
        try:
            token = RefreshToken(refresh_token)
        except TokenError:
            return Response(
                {"refresh": ["The refresh token is invalid or expired."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if str(token.get(api_settings.USER_ID_CLAIM)) != str(request.user.pk):
            return Response(
                {"refresh": ["This refresh token does not belong to the authenticated user."]},
                status=status.HTTP_403_FORBIDDEN,
            )
        token.blacklist()
        return Response(status=status.HTTP_205_RESET_CONTENT)


class AccountTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        try:
            token = self.token_class(attrs["refresh"])
        except TokenError as exc:
            raise InvalidToken("Token is invalid or expired") from exc
        user_id = token.get(api_settings.USER_ID_CLAIM)
        user = User.objects.filter(pk=user_id).first()
        if (
            user is None
            or not user.is_active
            or user.account_status != User.AccountStatus.ACTIVE
        ):
            raise AuthenticationFailed("This account is not active.")
        return super().validate(attrs)


class AccountTokenRefreshView(TokenRefreshView):
    serializer_class = AccountTokenRefreshSerializer


class MeView(generics.RetrieveAPIView):
    serializer_class = FarmerProfileSerializer
    permission_classes = [IsAuthenticated, IsActiveAccount]

    def get_object(self):
        if not hasattr(self.request.user, "farmer_profile"):
            return None
        return self.request.user.farmer_profile

    def retrieve(self, request, *args, **kwargs):
        profile = self.get_object()
        if profile is None:
            return Response(UserSerializer(request.user).data)
        return Response(self.get_serializer(profile).data)

    def patch(self, request, *args, **kwargs):
        profile = self.get_object()
        if profile is None:
            return Response(
                {"detail": "A farmer profile is not available for this account."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def put(self, request, *args, **kwargs):
        profile = self.get_object()
        if profile is None:
            return Response(
                {"detail": "A farmer profile is not available for this account."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = self.get_serializer(profile, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
