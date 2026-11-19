from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.reports.views import (
    AssignReportView,
    FarmerReportViewSet,
    ReopenReportView,
    ReportTransitionView,
    StaffReportViewSet,
    UnassignedReportListView,
)


router = DefaultRouter()
router.register("reports", FarmerReportViewSet, basename="farmer-report")
router.register("staff/reports", StaffReportViewSet, basename="staff-report")

urlpatterns = [
    path("staff/reports/unassigned/", UnassignedReportListView.as_view(), name="unassigned-reports"),
    path(
        "staff/reports/<int:report_id>/assignments/",
        AssignReportView.as_view(),
        name="report-assignments",
    ),
    path(
        "staff/reports/<int:report_id>/transition/",
        ReportTransitionView.as_view(),
        name="report-transition",
    ),
    path(
        "staff/reports/<int:report_id>/reopen/",
        ReopenReportView.as_view(),
        name="report-reopen",
    ),
    path("", include(router.urls)),
]
