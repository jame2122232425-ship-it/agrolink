from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.farms.views import (
    FarmActivityFeedView,
    FarmNoteViewSet,
    FarmPlotViewSet,
    FarmViewSet,
)


router = DefaultRouter()
router.register("farms", FarmViewSet, basename="farm")

farm_plots = FarmPlotViewSet.as_view({"get": "list", "post": "create"})
farm_plot_detail = FarmPlotViewSet.as_view(
    {"get": "retrieve", "put": "update", "patch": "partial_update", "delete": "destroy"}
)
farm_notes = FarmNoteViewSet.as_view({"get": "list", "post": "create"})
farm_note_detail = FarmNoteViewSet.as_view({"delete": "destroy"})

urlpatterns = [
    path("", include(router.urls)),
    path("farms/<int:farm_pk>/plots/", farm_plots, name="farm-plots"),
    path("farms/<int:farm_pk>/plots/<int:plot_pk>/", farm_plot_detail, name="farm-plot-detail"),
    path("farms/<int:farm_pk>/notes/", farm_notes, name="farm-notes"),
    path("farms/<int:farm_pk>/notes/<int:note_pk>/", farm_note_detail, name="farm-note-detail"),
    path(
        "farms/<int:farm_pk>/activity-feed/",
        FarmActivityFeedView.as_view(),
        name="farm-activity-feed",
    ),
]
