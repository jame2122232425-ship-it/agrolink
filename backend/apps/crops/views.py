from datetime import timedelta

from django.db.models import Count
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.farms.models import Farm
from apps.farms.permissions import FarmerOnly
from apps.crops.models import Crop, CropActivity, CropGrowthStage, CropHealthObservation
from apps.crops.serializers import (
    CropActivitySerializer,
    CropGrowthStageSerializer,
    CropHealthObservationSerializer,
    CropSerializer,
)


class DomainPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


def _integer_filter(request, key):
    value = request.query_params.get(key)
    if value is None:
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError) as exc:
        raise ValidationError({key: "Enter a valid integer ID."}) from exc
    if parsed < 1:
        raise ValidationError({key: "ID must be a positive integer."})
    return parsed


class CropGrowthStageViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CropGrowthStageSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None
    queryset = CropGrowthStage.objects.filter(is_active=True)


class CropViewSet(viewsets.ModelViewSet):
    serializer_class = CropSerializer
    permission_classes = [FarmerOnly]
    pagination_class = DomainPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["crop_name", "variety", "farm__name", "plot__name", "notes"]
    ordering_fields = [
        "crop_name",
        "planting_date",
        "expected_harvest_date",
        "area_planted",
        "status",
        "created_at",
    ]
    ordering = ["-created_at", "-id"]

    def get_queryset(self):
        queryset = Crop.objects.filter(farm__farmer=self.request.user).select_related(
            "farm", "plot", "growth_stage"
        )
        for key, field in (
            ("farm", "farm_id"),
            ("plot", "plot_id"),
            ("growth_stage", "growth_stage_id"),
        ):
            value = _integer_filter(self.request, key)
            if value is not None:
                queryset = queryset.filter(**{field: value})
        status_value = self.request.query_params.get("status")
        if status_value:
            if status_value not in Crop.Status.values:
                raise ValidationError({"status": "Select a valid crop status."})
            queryset = queryset.filter(status=status_value)
        name = self.request.query_params.get("crop_name")
        if name:
            queryset = queryset.filter(crop_name__icontains=name)
        return queryset

    @action(detail=True, methods=["get", "post"], url_path="health-records")
    def health_records(self, request, pk=None):
        crop = self.get_object()
        queryset = crop.health_observations.select_related("recorded_by")
        if request.method == "GET":
            page = self.paginate_queryset(queryset)
            serializer = CropHealthObservationSerializer(
                page if page is not None else queryset,
                many=True,
                context=self.get_serializer_context(),
            )
            if page is not None:
                return self.get_paginated_response(serializer.data)
            return Response(serializer.data)

        payload = request.data.copy()
        payload["crop"] = crop.pk
        serializer = CropHealthObservationSerializer(
            data=payload, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(crop=crop, recorded_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="activities")
    def activities(self, request, pk=None):
        crop = self.get_object()
        queryset = crop.activities.select_related("recorded_by")
        if request.method == "GET":
            page = self.paginate_queryset(queryset)
            serializer = CropActivitySerializer(
                page if page is not None else queryset,
                many=True,
                context=self.get_serializer_context(),
            )
            if page is not None:
                return self.get_paginated_response(serializer.data)
            return Response(serializer.data)

        payload = request.data.copy()
        payload["crop"] = crop.pk
        serializer = CropActivitySerializer(
            data=payload, context=self.get_serializer_context()
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(crop=crop, recorded_by=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CropHealthObservationViewSet(viewsets.ModelViewSet):
    serializer_class = CropHealthObservationSerializer
    permission_classes = [FarmerOnly]
    pagination_class = DomainPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["symptoms_observed", "notes", "crop__crop_name", "crop__farm__name"]
    ordering_fields = ["observation_date", "severity", "created_at"]
    ordering = ["-observation_date", "-id"]

    def get_queryset(self):
        queryset = CropHealthObservation.objects.filter(
            crop__farm__farmer=self.request.user
        ).select_related("crop", "recorded_by")
        farm_id = _integer_filter(self.request, "farm")
        if farm_id is not None:
            queryset = queryset.filter(crop__farm_id=farm_id)
        crop_id = _integer_filter(self.request, "crop")
        if crop_id is not None:
            queryset = queryset.filter(crop_id=crop_id)
        severity = self.request.query_params.get("severity")
        if severity:
            if severity not in CropHealthObservation.Severity.values:
                raise ValidationError({"severity": "Select a valid severity."})
            queryset = queryset.filter(severity=severity)
        return queryset

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


class CropActivityViewSet(viewsets.ModelViewSet):
    serializer_class = CropActivitySerializer
    permission_classes = [FarmerOnly]
    pagination_class = DomainPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "description",
        "product_or_treatment",
        "crop__crop_name",
        "crop__farm__name",
    ]
    ordering_fields = ["activity_date", "activity_type", "created_at"]
    ordering = ["-activity_date", "-id"]

    def get_queryset(self):
        queryset = CropActivity.objects.filter(
            crop__farm__farmer=self.request.user
        ).select_related("crop", "recorded_by")
        farm_id = _integer_filter(self.request, "farm")
        if farm_id is not None:
            queryset = queryset.filter(crop__farm_id=farm_id)
        crop_id = _integer_filter(self.request, "crop")
        if crop_id is not None:
            queryset = queryset.filter(crop_id=crop_id)
        activity_type = self.request.query_params.get("activity_type")
        if activity_type:
            if activity_type not in CropActivity.ActivityType.values:
                raise ValidationError({"activity_type": "Select a valid activity type."})
            queryset = queryset.filter(activity_type=activity_type)
        return queryset

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


class CropSummaryView(APIView):
    permission_classes = [IsAuthenticated, FarmerOnly]

    def get(self, request, farm_pk):
        farm = get_object_or_404(Farm, pk=farm_pk, farmer=request.user)
        crops = Crop.objects.filter(farm=farm)
        today = timezone.localdate()
        stage_counts = crops.values("growth_stage__name").annotate(total=Count("pk"))
        distribution = [
            {
                "growth_stage": row["growth_stage__name"] or "Unspecified",
                "count": row["total"],
            }
            for row in stage_counts
        ]
        return Response(
            {
                "farm": farm.pk,
                "total_crops": crops.count(),
                "active_crops": crops.filter(status=Crop.Status.ACTIVE).count(),
                "approaching_harvest": crops.filter(
                    status=Crop.Status.ACTIVE,
                    expected_harvest_date__gte=today,
                    expected_harvest_date__lte=today + timedelta(days=30),
                ).count(),
                "growth_stage_distribution": distribution,
            }
        )
