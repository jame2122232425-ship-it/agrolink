import mimetypes

from django.db.models import Q
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.views.generic import TemplateView
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import FarmerProfile
from apps.farms.permissions import FarmerOnly
from apps.community.permissions import IsActiveFarmer
from apps.reports.permissions import CanReadReportEvidence


class HealthView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"status": "ok", "service": "agrolink-api", "version": "v1"})


class LandingPageView(TemplateView):
    template_name = "landing.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["health_url"] = reverse("health")
        context["admin_url"] = reverse("admin:index")
        context["staff_login_url"] = reverse("staff:login")
        return context


class PrivateImageView(APIView):
    permission_classes = [FarmerOnly]

    def get_permissions(self):
        if self.kwargs.get("resource") == "report-evidence":
            return [CanReadReportEvidence()]
        if self.kwargs.get("resource") == "community-post":
            return [IsActiveFarmer()]
        return super().get_permissions()

    def get(self, request, resource, pk):
        from apps.ai_assistant.models import Message
        from apps.crops.models import Crop, CropHealthObservation
        from apps.community.models import CommunityPost
        from apps.livestock.models import (
            Animal,
            LivestockGroup,
            LivestockHealthObservation,
        )
        from apps.reports.models import ReportEvidence
        from apps.reports.services import is_assigned_handler

        resources = {
            "ai-message": (Message, Q(conversation__owner=request.user)),
            "crop": (Crop, Q(farm__farmer=request.user)),
            "crop-observation": (CropHealthObservation, Q(crop__farm__farmer=request.user)),
            "livestock-group": (LivestockGroup, Q(farm__farmer=request.user)),
            "livestock-animal": (Animal, Q(farm__farmer=request.user)),
            "livestock-observation": (
                LivestockHealthObservation,
                Q(animal__farm__farmer=request.user)
                | Q(group__farm__farmer=request.user),
            ),
            "community-post": (
                CommunityPost,
                Q(status__in=[CommunityPost.Status.OPEN, CommunityPost.Status.RESOLVED]),
            ),
        }
        if resource == "report-evidence":
            item = get_object_or_404(
                ReportEvidence.objects.select_related("report__farmer").filter(pk=pk)
            )
            if item.report.farmer_id != request.user.pk and not is_assigned_handler(
                item.report, request.user
            ):
                raise NotFound("Image not found.")
            image = item.image
        elif resource == "profile-picture":
            item = get_object_or_404(
                FarmerProfile.objects.filter(user=request.user),
                pk=pk,
            )
            image = item.profile_picture
        elif resource in resources:
            model, owner_filter = resources[resource]
            item = get_object_or_404(model.objects.filter(owner_filter).distinct(), pk=pk)
            image = item.image
        else:
            raise NotFound("Image not found.")
        if not image:
            raise NotFound("Image not found.")

        image = image.open("rb")
        filename = image.name.rsplit("/", 1)[-1]
        content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
        response = FileResponse(image, as_attachment=True, filename=filename, content_type=content_type)
        response["X-Content-Type-Options"] = "nosniff"
        response["Cache-Control"] = "private, no-store"
        return response
