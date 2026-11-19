from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.livestock.views import (
    AnimalViewSet,
    LivestockActivityViewSet,
    LivestockGroupViewSet,
    LivestockHealthObservationViewSet,
    LivestockMedicalRecordViewSet,
    LivestockSummaryView,
)


router = DefaultRouter()
router.register("livestock/groups", LivestockGroupViewSet, basename="livestock-group")
router.register("livestock/animals", AnimalViewSet, basename="livestock-animal")
router.register(
    "livestock/health-records",
    LivestockHealthObservationViewSet,
    basename="livestock-health-record",
)
router.register("livestock/activities", LivestockActivityViewSet, basename="livestock-activity")
router.register(
    "livestock/medical-records",
    LivestockMedicalRecordViewSet,
    basename="livestock-medical-record",
)

urlpatterns = [
    path("", include(router.urls)),
    path(
        "farms/<int:farm_pk>/livestock-summary/",
        LivestockSummaryView.as_view(),
        name="livestock-summary",
    ),
]
