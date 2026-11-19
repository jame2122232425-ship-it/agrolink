from django.db.models import Count, Q
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
from apps.livestock.models import (
    Animal,
    LivestockActivity,
    LivestockGroup,
    LivestockHealthObservation,
    LivestockMedicalRecord,
)
from apps.livestock.serializers import (
    AnimalSerializer,
    LivestockActivitySerializer,
    LivestockGroupSerializer,
    LivestockHealthObservationSerializer,
    LivestockMedicalRecordSerializer,
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


def _filter_subject_queryset(request, queryset):
    farm_id = _integer_filter(request, "farm")
    animal_id = _integer_filter(request, "animal")
    group_id = _integer_filter(request, "group")
    if farm_id is not None:
        queryset = queryset.filter(
            Q(animal__farm_id=farm_id) | Q(group__farm_id=farm_id)
        )
    if animal_id is not None:
        queryset = queryset.filter(animal_id=animal_id)
    if group_id is not None:
        queryset = queryset.filter(group_id=group_id)
    return queryset


class LivestockSubjectActions:
    def _related_records(self, request, serializer_class, subject_field):
        subject = self.get_object()
        model = serializer_class.Meta.model
        queryset = model.objects.filter(**{subject_field: subject})

        if request.method == "GET":
            page = self.paginate_queryset(queryset)
            serializer = serializer_class(
                page if page is not None else queryset,
                many=True,
                context=self.get_serializer_context(),
            )
            if page is not None:
                return self.get_paginated_response(serializer.data)
            return Response(serializer.data)

        payload = request.data.copy()
        payload[subject_field] = subject.pk
        other_field = "group" if subject_field == "animal" else "animal"
        payload[other_field] = None
        serializer = serializer_class(data=payload, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        save_kwargs = {"recorded_by": request.user}
        if serializer_class is LivestockMedicalRecordSerializer:
            save_kwargs["entry_type"] = LivestockMedicalRecord.EntryType.FARMER_REPORTED
        serializer.save(**{subject_field: subject}, **save_kwargs)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="health-records")
    def health_records(self, request, pk=None):
        return self._related_records(
            request, LivestockHealthObservationSerializer, self.subject_field
        )

    @action(detail=True, methods=["get", "post"], url_path="activities")
    def activities(self, request, pk=None):
        return self._related_records(
            request, LivestockActivitySerializer, self.subject_field
        )

    @action(detail=True, methods=["get", "post"], url_path="medical-records")
    def medical_records(self, request, pk=None):
        return self._related_records(
            request, LivestockMedicalRecordSerializer, self.subject_field
        )


class LivestockGroupViewSet(LivestockSubjectActions, viewsets.ModelViewSet):
    serializer_class = LivestockGroupSerializer
    permission_classes = [FarmerOnly]
    pagination_class = DomainPagination
    subject_field = "group"
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["species", "breed", "group_name", "production_purpose", "notes"]
    ordering_fields = ["species", "group_name", "animal_count", "acquisition_date", "created_at"]
    ordering = ["species", "group_name", "id"]

    def get_queryset(self):
        queryset = LivestockGroup.objects.filter(farm__farmer=self.request.user).select_related(
            "farm"
        )
        farm_id = _integer_filter(self.request, "farm")
        if farm_id is not None:
            queryset = queryset.filter(farm_id=farm_id)
        species = self.request.query_params.get("species")
        if species:
            queryset = queryset.filter(species__iexact=species)
        active = self.request.query_params.get("is_active")
        if active is not None:
            if active.lower() not in {"true", "false"}:
                raise ValidationError({"is_active": "Use true or false."})
            queryset = queryset.filter(is_active=active.lower() == "true")
        return queryset


class AnimalViewSet(LivestockSubjectActions, viewsets.ModelViewSet):
    serializer_class = AnimalSerializer
    permission_classes = [FarmerOnly]
    pagination_class = DomainPagination
    subject_field = "animal"
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "identification_number",
        "name_or_tag",
        "species",
        "breed",
        "production_purpose",
    ]
    ordering_fields = ["species", "name_or_tag", "birth_date", "status", "created_at"]
    ordering = ["species", "name_or_tag", "id"]

    def get_queryset(self):
        queryset = Animal.objects.filter(farm__farmer=self.request.user).select_related(
            "farm", "group"
        )
        farm_id = _integer_filter(self.request, "farm")
        group_id = _integer_filter(self.request, "group")
        if farm_id is not None:
            queryset = queryset.filter(farm_id=farm_id)
        if group_id is not None:
            queryset = queryset.filter(group_id=group_id)
        species = self.request.query_params.get("species")
        if species:
            queryset = queryset.filter(species__iexact=species)
        animal_status = self.request.query_params.get("status")
        if animal_status:
            if animal_status not in Animal.Status.values:
                raise ValidationError({"status": "Select a valid animal status."})
            queryset = queryset.filter(status=animal_status)
        return queryset


class LivestockHealthObservationViewSet(viewsets.ModelViewSet):
    serializer_class = LivestockHealthObservationSerializer
    permission_classes = [FarmerOnly]
    pagination_class = DomainPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["symptoms_reported", "farmer_notes", "animal__species", "group__species"]
    ordering_fields = ["observation_date", "severity", "created_at"]
    ordering = ["-observation_date", "-id"]

    def get_queryset(self):
        queryset = LivestockHealthObservation.objects.filter(
            Q(animal__farm__farmer=self.request.user)
            | Q(group__farm__farmer=self.request.user)
        ).select_related("animal", "group", "recorded_by")
        queryset = _filter_subject_queryset(self.request, queryset)
        severity = self.request.query_params.get("severity")
        if severity:
            if severity not in LivestockHealthObservation.Severity.values:
                raise ValidationError({"severity": "Select a valid severity."})
            queryset = queryset.filter(severity=severity)
        return queryset

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


class LivestockActivityViewSet(viewsets.ModelViewSet):
    serializer_class = LivestockActivitySerializer
    permission_classes = [FarmerOnly]
    pagination_class = DomainPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["description", "product_or_treatment", "animal__species", "group__species"]
    ordering_fields = ["activity_date", "activity_type", "created_at"]
    ordering = ["-activity_date", "-id"]

    def get_queryset(self):
        queryset = LivestockActivity.objects.filter(
            Q(animal__farm__farmer=self.request.user)
            | Q(group__farm__farmer=self.request.user)
        ).select_related("animal", "group", "recorded_by")
        queryset = _filter_subject_queryset(self.request, queryset)
        activity_type = self.request.query_params.get("activity_type")
        if activity_type:
            if activity_type not in LivestockActivity.ActivityType.values:
                raise ValidationError({"activity_type": "Select a valid activity type."})
            queryset = queryset.filter(activity_type=activity_type)
        return queryset

    def perform_create(self, serializer):
        serializer.save(recorded_by=self.request.user)


class LivestockMedicalRecordViewSet(viewsets.ModelViewSet):
    serializer_class = LivestockMedicalRecordSerializer
    permission_classes = [FarmerOnly]
    pagination_class = DomainPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "product_or_vaccine",
        "administered_by",
        "animal__species",
        "group__species",
    ]
    ordering_fields = ["administration_date", "next_scheduled_date", "record_type", "created_at"]
    ordering = ["-administration_date", "-id"]

    def get_queryset(self):
        queryset = LivestockMedicalRecord.objects.filter(
            Q(animal__farm__farmer=self.request.user)
            | Q(group__farm__farmer=self.request.user)
        ).select_related("animal", "group", "recorded_by")
        queryset = _filter_subject_queryset(self.request, queryset)
        record_type = self.request.query_params.get("record_type")
        if record_type:
            if record_type not in LivestockMedicalRecord.RecordType.values:
                raise ValidationError({"record_type": "Select vaccination or treatment."})
            queryset = queryset.filter(record_type=record_type)
        return queryset

    def perform_create(self, serializer):
        serializer.save(
            recorded_by=self.request.user,
            entry_type=LivestockMedicalRecord.EntryType.FARMER_REPORTED,
        )


class LivestockSummaryView(APIView):
    permission_classes = [IsAuthenticated, FarmerOnly]

    def get(self, request, farm_pk):
        farm = get_object_or_404(Farm, pk=farm_pk, farmer=request.user)
        groups = LivestockGroup.objects.filter(farm=farm, is_active=True)
        animals = Animal.objects.filter(farm=farm, status=Animal.Status.ACTIVE)

        counts_by_species = {}
        group_rows = groups.values("species", "animal_count").annotate(
            tracked_animals=Count(
                "animals", filter=Q(animals__status=Animal.Status.ACTIVE)
            )
        )
        for row in group_rows:
            species = row["species"]
            counts_by_species[species] = counts_by_species.get(species, 0) + max(
                row["animal_count"], row["tracked_animals"]
            )
        for row in (
            animals.filter(group__isnull=True)
            .values("species")
            .annotate(total=Count("pk"))
        ):
            species = row["species"]
            counts_by_species[species] = counts_by_species.get(species, 0) + row["total"]

        today = timezone.localdate()
        scheduled = []
        health_records = LivestockMedicalRecord.objects.filter(
            next_scheduled_date__gte=today
        ).filter(
            Q(animal__farm=farm, animal__status=Animal.Status.ACTIVE)
            | Q(group__farm=farm, group__is_active=True)
        ).select_related("animal", "group")
        for record in health_records:
            subject = record.animal or record.group
            scheduled.append(
                {
                    "type": record.record_type,
                    "date": record.next_scheduled_date,
                    "description": record.product_or_vaccine,
                    "subject": subject.name_or_tag
                    if record.animal and record.animal.name_or_tag
                    else subject.group_name
                    if record.group
                    else subject.identification_number
                    or subject.species,
                }
            )
        future_activities = LivestockActivity.objects.filter(
            activity_date__gte=today,
            activity_type__in=[
                LivestockActivity.ActivityType.VACCINATION,
                LivestockActivity.ActivityType.DEWORMING,
                LivestockActivity.ActivityType.VETERINARY_CHECKUP,
            ],
        ).filter(
            Q(animal__farm=farm, animal__status=Animal.Status.ACTIVE)
            | Q(group__farm=farm, group__is_active=True)
        ).select_related("animal", "group")
        for activity in future_activities:
            subject = activity.animal or activity.group
            scheduled.append(
                {
                    "type": activity.activity_type,
                    "date": activity.activity_date,
                    "description": activity.description,
                    "subject": subject.name_or_tag
                    if activity.animal and activity.animal.name_or_tag
                    else subject.group_name
                    if activity.group
                    else subject.identification_number
                    or subject.species,
                }
            )
        scheduled.sort(key=lambda item: (item["date"], item["type"], item["subject"]))
        return Response(
            {
                "farm": farm.pk,
                "total_animals": sum(counts_by_species.values()),
                "counts_by_species": [
                    {"species": species, "count": count}
                    for species, count in sorted(counts_by_species.items())
                ],
                "active_livestock_groups": groups.count(),
                "upcoming_health_activities": scheduled,
            }
        )
