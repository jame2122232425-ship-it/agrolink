from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.crops.models import CropActivity
from apps.farms.models import Farm, FarmNote, FarmPlot
from apps.farms.permissions import FarmerOnly
from apps.farms.serializers import FarmNoteSerializer, FarmPlotSerializer, FarmSerializer
from apps.livestock.models import LivestockActivity, LivestockMedicalRecord
from apps.reports.models import AgriculturalReport


class FarmViewSet(viewsets.ModelViewSet):
    serializer_class = FarmSerializer
    permission_classes = [FarmerOnly]

    def get_queryset(self):
        return Farm.objects.filter(farmer=self.request.user).select_related("farmer")

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user)


class FarmPlotViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = FarmPlotSerializer
    permission_classes = [FarmerOnly]
    lookup_url_kwarg = "plot_pk"

    def get_queryset(self):
        farm = get_object_or_404(Farm, pk=self.kwargs["farm_pk"], farmer=self.request.user)
        return FarmPlot.objects.filter(
            farm=farm,
        ).select_related("farm")

    def perform_create(self, serializer):
        farm = get_object_or_404(
            Farm, pk=self.kwargs["farm_pk"], farmer=self.request.user
        )
        serializer.save(farm=farm)


class FarmNoteViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = FarmNoteSerializer
    permission_classes = [FarmerOnly]
    pagination_class = None
    lookup_url_kwarg = "note_pk"

    def get_queryset(self):
        farm = get_object_or_404(Farm, pk=self.kwargs["farm_pk"], farmer=self.request.user)
        return FarmNote.objects.filter(farm=farm).select_related("farm", "author")

    def perform_create(self, serializer):
        farm = get_object_or_404(
            Farm, pk=self.kwargs["farm_pk"], farmer=self.request.user
        )
        serializer.save(farm=farm, author=self.request.user)


def _livestock_subject(record):
    if record.animal_id:
        animal = record.animal
        return animal.name_or_tag or animal.identification_number or animal.species
    if record.group_id:
        return record.group.group_name
    return ""


class FarmActivityFeedView(APIView):
    permission_classes = [IsAuthenticated, FarmerOnly]

    def get(self, request, farm_pk):
        farm = get_object_or_404(Farm, pk=farm_pk, farmer=request.user)
        try:
            limit = int(request.query_params.get("limit", 100))
        except (TypeError, ValueError) as exc:
            raise ValidationError({"limit": "Enter a whole number."}) from exc
        limit = max(1, min(limit, 200))
        today = timezone.localdate()
        items = []

        crop_activities = (
            CropActivity.objects.filter(crop__farm=farm)
            .select_related("crop", "crop__plot")
            .order_by("-activity_date", "-id")[:limit]
        )
        for activity in crop_activities:
            items.append(
                {
                    "id": f"crop-activity-{activity.pk}",
                    "source": "crop_activity",
                    "source_id": activity.pk,
                    "category": "crop",
                    "title": activity.get_activity_type_display(),
                    "detail": activity.description,
                    "subject": activity.crop.crop_name,
                    "location": activity.crop.plot.name if activity.crop.plot_id else "",
                    "date": activity.activity_date.isoformat(),
                    "status": "scheduled"
                    if activity.activity_date > today
                    else "completed",
                }
            )

        livestock_activities = (
            LivestockActivity.objects.filter(Q(animal__farm=farm) | Q(group__farm=farm))
            .select_related("animal", "group")
            .order_by("-activity_date", "-id")[:limit]
        )
        for activity in livestock_activities:
            items.append(
                {
                    "id": f"livestock-activity-{activity.pk}",
                    "source": "livestock_activity",
                    "source_id": activity.pk,
                    "category": "dairy",
                    "title": activity.get_activity_type_display(),
                    "detail": activity.description,
                    "subject": _livestock_subject(activity),
                    "location": "",
                    "date": activity.activity_date.isoformat(),
                    "status": "scheduled"
                    if activity.activity_date > today
                    else "completed",
                }
            )

        medical_records = (
            LivestockMedicalRecord.objects.filter(Q(animal__farm=farm) | Q(group__farm=farm))
            .select_related("animal", "group")
            .order_by("-administration_date", "-id")[:limit]
        )
        for record in medical_records:
            items.append(
                {
                    "id": f"livestock-medical-{record.pk}",
                    "source": "livestock_medical",
                    "source_id": record.pk,
                    "category": "dairy",
                    "title": f"{record.get_record_type_display()}: {record.product_or_vaccine}",
                    "detail": record.notes or record.administered_by,
                    "subject": _livestock_subject(record),
                    "location": "",
                    "date": record.administration_date.isoformat(),
                    "status": "completed",
                }
            )

        reports = AgriculturalReport.objects.filter(farm=farm).order_by(
            "-submitted_at", "-id"
        )[:limit]
        closed_statuses = {
            AgriculturalReport.Status.RESOLVED,
            AgriculturalReport.Status.CLOSED,
            AgriculturalReport.Status.REJECTED,
            AgriculturalReport.Status.DUPLICATE,
        }
        for report in reports:
            items.append(
                {
                    "id": f"report-{report.pk}",
                    "source": "report",
                    "source_id": report.pk,
                    "category": "report",
                    "title": report.title,
                    "detail": report.description,
                    "subject": report.report_reference,
                    "location": report.location_details,
                    "date": report.submitted_at.isoformat(),
                    "status": "completed"
                    if report.status in closed_statuses
                    else "in_progress",
                }
            )

        notes = FarmNote.objects.filter(farm=farm).order_by("-note_date", "-id")[:limit]
        for note in notes:
            items.append(
                {
                    "id": f"farm-note-{note.pk}",
                    "source": "farm_note",
                    "source_id": note.pk,
                    "category": note.category,
                    "title": note.title,
                    "detail": note.detail,
                    "subject": note.get_category_display(),
                    "location": farm.name,
                    "date": note.note_date.isoformat(),
                    "status": "completed",
                }
            )

        items.sort(key=lambda item: (item["date"], item["id"]), reverse=True)
        results = items[:limit]
        return Response({"farm": farm.pk, "count": len(results), "results": results})
