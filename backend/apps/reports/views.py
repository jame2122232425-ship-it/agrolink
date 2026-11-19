from django.shortcuts import get_object_or_404
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.reports.models import AgriculturalReport
from apps.reports.permissions import (
    IsReportCoordinator,
    IsReportStaff,
    is_report_coordinator,
)
from apps.reports.serializers import (
    CaseAssignmentCreateSerializer,
    CaseAssignmentSerializer,
    FarmerClarificationSerializer,
    FarmerReportEditSerializer,
    FarmerReportSerializer,
    ReportCreateSerializer,
    ReportEvidenceSerializer,
    ReportFilterMixin,
    ReportReopenSerializer,
    ReportTransitionSerializer,
    ReportUpdateSerializer,
    StaffReportSerializer,
    StaffReportUpdateSerializer,
    UnassignedReportSerializer,
)
from apps.reports.services import (
    ReportAccessError,
    ReportWorkflowError,
    add_farmer_clarification,
    add_report_evidence,
    add_staff_update,
    assigned_reports_for,
    assign_report,
    reopen_report,
    transition_report,
    unassigned_reports,
)


class ReportPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


def _workflow_response(operation, **kwargs):
    try:
        return operation(**kwargs)
    except ReportAccessError as exc:
        raise PermissionDenied(str(exc)) from exc
    except ReportWorkflowError as exc:
        raise ValidationError({"detail": str(exc)}) from exc


def _get_workflow_report(request, report_id):
    queryset = AgriculturalReport.objects.select_related("farmer", "farm")
    if not is_report_coordinator(request.user):
        queryset = queryset.filter(
            assignments__assigned_user=request.user,
            assignments__assignment_role=request.user.role,
            assignments__is_active=True,
        )
    return get_object_or_404(queryset.distinct(), pk=report_id)


class _FarmerAccountPermission(BasePermission):
    message = "Only active farmer accounts can manage farmer reports."

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.is_active
            and request.user.role == User.Role.FARMER
            and request.user.account_status == User.AccountStatus.ACTIVE
        )


class FarmerReportViewSet(ReportFilterMixin, viewsets.ModelViewSet):
    permission_classes = [_FarmerAccountPermission]
    pagination_class = ReportPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["report_reference", "title", "description", "farm__name"]
    ordering_fields = ["submitted_at", "updated_at", "severity", "status", "category"]
    ordering = ["-submitted_at", "-id"]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        queryset = AgriculturalReport.objects.filter(farmer=self.request.user).select_related(
            "farm", "plot", "crop", "livestock_group", "animal"
        )
        return self.apply_report_filters(queryset)

    def get_serializer_class(self):
        if self.action in {"update", "partial_update"}:
            return FarmerReportEditSerializer
        if self.action == "create":
            return ReportCreateSerializer
        return FarmerReportSerializer

    def perform_update(self, serializer):
        if serializer.instance.status != AgriculturalReport.Status.SUBMITTED:
            raise ValidationError({"detail": "Only submitted reports can be edited."})
        serializer.save()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = serializer.save()
        return Response(
            FarmerReportSerializer(report, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get", "post"], url_path="updates")
    def updates(self, request, pk=None):
        report = self.get_object()
        if request.method == "GET":
            queryset = report.updates.filter(visible_to_farmer=True).select_related("author")
            page = self.paginate_queryset(queryset)
            serializer = ReportUpdateSerializer(
                page if page is not None else queryset,
                many=True,
                context=self.get_serializer_context(),
            )
            if page is not None:
                return self.get_paginated_response(serializer.data)
            return Response(serializer.data)

        serializer = FarmerClarificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        update = _workflow_response(
            add_farmer_clarification,
            report=report,
            farmer=request.user,
            message=serializer.validated_data["message"],
        )
        return Response(
            ReportUpdateSerializer(update, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get", "post"], url_path="evidence")
    def evidence(self, request, pk=None):
        report = self.get_object()
        if request.method == "GET":
            queryset = report.evidence.select_related("uploaded_by")
            page = self.paginate_queryset(queryset)
            serializer = ReportEvidenceSerializer(
                page if page is not None else queryset,
                many=True,
                context=self.get_serializer_context(),
            )
            if page is not None:
                return self.get_paginated_response(serializer.data)
            return Response(serializer.data)

        serializer = ReportEvidenceSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        evidence = _workflow_response(
            add_report_evidence,
            report=report,
            actor=request.user,
            image=serializer.validated_data["image"],
            caption=serializer.validated_data.get("caption", ""),
        )
        return Response(
            ReportEvidenceSerializer(evidence, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


class StaffReportViewSet(ReportFilterMixin, viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsReportStaff]
    pagination_class = ReportPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["report_reference", "title", "description", "farm__name"]
    ordering_fields = ["submitted_at", "updated_at", "severity", "status", "category"]
    ordering = ["-submitted_at", "-id"]
    serializer_class = StaffReportSerializer

    def get_queryset(self):
        queryset = (
            AgriculturalReport.objects.all()
            if is_report_coordinator(self.request.user)
            else assigned_reports_for(self.request.user)
        )
        queryset = queryset.select_related(
            "farmer", "farm", "plot", "crop", "livestock_group", "animal"
        )
        return self.apply_report_filters(queryset).distinct()

    @action(detail=True, methods=["get", "post"], url_path="updates")
    def updates(self, request, pk=None):
        report = self.get_object()
        if request.method == "GET":
            queryset = report.updates.select_related("author")
            page = self.paginate_queryset(queryset)
            serializer = ReportUpdateSerializer(
                page if page is not None else queryset,
                many=True,
                context=self.get_serializer_context(),
            )
            if page is not None:
                return self.get_paginated_response(serializer.data)
            return Response(serializer.data)

        serializer = StaffReportUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        update = _workflow_response(
            add_staff_update,
            report=report,
            author=request.user,
            **serializer.validated_data,
        )
        return Response(
            ReportUpdateSerializer(update, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get", "post"], url_path="evidence")
    def evidence(self, request, pk=None):
        report = self.get_object()
        if request.method == "GET":
            queryset = report.evidence.select_related("uploaded_by")
            page = self.paginate_queryset(queryset)
            serializer = ReportEvidenceSerializer(
                page if page is not None else queryset,
                many=True,
                context=self.get_serializer_context(),
            )
            if page is not None:
                return self.get_paginated_response(serializer.data)
            return Response(serializer.data)

        serializer = ReportEvidenceSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        evidence = _workflow_response(
            add_report_evidence,
            report=report,
            actor=request.user,
            image=serializer.validated_data["image"],
            caption=serializer.validated_data.get("caption", ""),
        )
        return Response(
            ReportEvidenceSerializer(evidence, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="assignments")
    def assignments(self, request, pk=None):
        report = self.get_object()
        queryset = report.assignments.select_related("assigned_user", "assigned_by")
        page = self.paginate_queryset(queryset)
        serializer = CaseAssignmentSerializer(
            page if page is not None else queryset,
            many=True,
            context=self.get_serializer_context(),
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


class UnassignedReportListView(ReportFilterMixin, ListAPIView):
    permission_classes = [IsReportCoordinator]
    serializer_class = UnassignedReportSerializer
    pagination_class = ReportPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["report_reference", "title", "description", "farm__name"]
    ordering_fields = ["submitted_at", "severity", "status", "category"]
    ordering = ["-submitted_at", "-id"]

    def get_queryset(self):
        queryset = unassigned_reports().select_related("farm")
        return self.apply_report_filters(queryset).distinct()


class AssignReportView(APIView):
    permission_classes = [IsReportCoordinator]

    def post(self, request, report_id):
        report = get_object_or_404(AgriculturalReport, pk=report_id)
        serializer = CaseAssignmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assignment = _workflow_response(
            assign_report,
            report=report,
            assigned_user=serializer.validated_data["assigned_user"],
            actor=request.user,
            reason=serializer.validated_data["reason"],
        )
        return Response(
            CaseAssignmentSerializer(assignment).data,
            status=status.HTTP_201_CREATED,
        )


class ReportTransitionView(APIView):
    permission_classes = [IsReportStaff]

    def post(self, request, report_id):
        report = _get_workflow_report(request, report_id)
        serializer = ReportTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = _workflow_response(
            transition_report,
            report=report,
            actor=request.user,
            **serializer.validated_data,
        )
        return Response(FarmerReportSerializer(report).data)


class ReopenReportView(APIView):
    permission_classes = [IsReportStaff]

    def post(self, request, report_id):
        report = _get_workflow_report(request, report_id)
        serializer = ReportReopenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        report = _workflow_response(
            reopen_report,
            report=report,
            actor=request.user,
            **serializer.validated_data,
        )
        return Response(FarmerReportSerializer(report).data)


