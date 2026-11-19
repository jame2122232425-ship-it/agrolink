from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.crops.views import (
    CropActivityViewSet,
    CropGrowthStageViewSet,
    CropHealthObservationViewSet,
    CropSummaryView,
    CropViewSet,
)


router = DefaultRouter()
router.register("crops", CropViewSet, basename="crop")
router.register("crop-growth-stages", CropGrowthStageViewSet, basename="crop-growth-stage")
router.register("crop-health-records", CropHealthObservationViewSet, basename="crop-health")
router.register("crop-activities", CropActivityViewSet, basename="crop-activity")

urlpatterns = [
    path("", include(router.urls)),
    path("farms/<int:farm_pk>/crop-summary/", CropSummaryView.as_view(), name="crop-summary"),
]
