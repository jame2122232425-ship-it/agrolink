from django.db import IntegrityError, transaction
from django.db.models import Count, Exists, OuterRef, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import FarmerProfile, User
from apps.community.models import CommunityContentReport, CommunityPost, CommunityReaction, CommunityReply
from apps.community.permissions import CanModerateCommunity, IsActiveFarmer
from apps.community.serializers import CommunityContentReportSerializer, CommunityPostSerializer, CommunityReplySerializer
from apps.notifications.models import Notification
from apps.notifications.services import create_notification


class CommunityPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50


def post_queryset(user):
    reactions = CommunityReaction.objects.filter(post=OuterRef("pk"), user=user)
    return CommunityPost.objects.filter(status__in=[CommunityPost.Status.OPEN, CommunityPost.Status.RESOLVED]).select_related(
        "author", "accepted_reply", "accepted_reply__author"
    ).annotate(
        reply_count=Count("replies", filter=Q(replies__is_hidden=False), distinct=True),
        reaction_count=Count("reactions", distinct=True),
        reacted_by_me=Exists(reactions),
    ).order_by("-created_at", "-id")


class CommunityPostViewSet(viewsets.ModelViewSet):
    serializer_class = CommunityPostSerializer
    permission_classes = [IsActiveFarmer]
    pagination_class = CommunityPagination
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = post_queryset(self.request.user)
        topic = self.request.query_params.get("topic")
        county = self.request.query_params.get("county")
        search = self.request.query_params.get("search", "").strip()
        unanswered = self.request.query_params.get("unanswered") == "true"
        if topic in CommunityPost.Topic.values:
            queryset = queryset.filter(topic=topic)
        if county:
            queryset = queryset.filter(county__iexact=county)
        if search:
            queryset = queryset.filter(Q(title__icontains=search) | Q(body__icontains=search))
        if unanswered:
            queryset = queryset.filter(reply_count=0)
        if self.request.query_params.get("ordering") == "popular":
            queryset = queryset.order_by("-reaction_count", "-created_at")
        return queryset

    def perform_create(self, serializer):
        county = FarmerProfile.objects.filter(user=self.request.user).values_list("county", flat=True).first() or ""
        serializer.save(author=self.request.user, county=county)

    def perform_update(self, serializer):
        post = self.get_object()
        if post.author_id != self.request.user.pk:
            raise PermissionDenied("You can only edit your own question.")
        if post.status != CommunityPost.Status.OPEN:
            raise PermissionDenied("Only open questions can be edited.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.author_id != self.request.user.pk:
            raise PermissionDenied("You can only remove your own question.")
        instance.status = CommunityPost.Status.HIDDEN
        instance.save(update_fields=["status", "updated_at"])

    @action(detail=True, methods=["post"])
    def react(self, request, pk=None):
        post = self.get_object()
        reaction, created = CommunityReaction.objects.get_or_create(post=post, user=request.user)
        if not created:
            reaction.delete()
        return Response({"reacted": created, "reaction_count": post.reactions.count()})

    @action(detail=True, methods=["post"], url_path="accept-reply")
    def accept_reply(self, request, pk=None):
        post = self.get_object()
        if post.author_id != request.user.pk:
            raise PermissionDenied("Only the question author can accept a reply.")
        reply = get_object_or_404(CommunityReply, pk=request.data.get("reply"), post=post, is_hidden=False)
        post.accepted_reply = reply
        post.status = CommunityPost.Status.RESOLVED
        post.save(update_fields=["accepted_reply", "status", "updated_at"])
        if reply.author_id != request.user.pk:
            create_notification(
                recipient=reply.author,
                event_key=f"community-answer-accepted:{post.pk}:{reply.pk}",
                notification_type=Notification.Type.COMMUNITY,
                title="Your answer was marked helpful",
                message=f'The farmer who asked "{post.title}" accepted your answer.',
                action_url=f"/community/{post.pk}",
            )
        return Response(self.get_serializer(post).data)


class CommunityReplyListCreateView(APIView):
    permission_classes = [IsActiveFarmer]

    def get(self, request, post_id):
        post = get_object_or_404(post_queryset(request.user), pk=post_id)
        replies = post.replies.filter(is_hidden=False).select_related("author")
        return Response(CommunityReplySerializer(replies, many=True, context={"request": request}).data)

    def post(self, request, post_id):
        post = get_object_or_404(post_queryset(request.user), pk=post_id)
        if post.status == CommunityPost.Status.RESOLVED:
            return Response({"detail": "This question is resolved and no longer accepts replies."}, status=409)
        serializer = CommunityReplySerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        reply = serializer.save(post=post, author=request.user)
        if post.author_id != request.user.pk:
            create_notification(
                recipient=post.author,
                event_key=f"community-reply:{reply.pk}",
                notification_type=Notification.Type.COMMUNITY,
                title="New reply to your question",
                message=f'{reply.author.first_name} replied to "{post.title}".',
                action_url=f"/community/{post.pk}",
            )
        return Response(CommunityReplySerializer(reply, context={"request": request}).data, status=201)


class CommunityReplyDeleteView(APIView):
    permission_classes = [IsActiveFarmer]

    def delete(self, request, reply_id):
        reply = get_object_or_404(CommunityReply.objects.select_related("post"), pk=reply_id, is_hidden=False)
        if reply.author_id != request.user.pk:
            raise PermissionDenied("You can only remove your own reply.")
        reply.is_hidden = True
        reply.save(update_fields=["is_hidden", "updated_at"])
        if reply.post.accepted_reply_id == reply.pk:
            reply.post.accepted_reply = None
            reply.post.status = CommunityPost.Status.OPEN
            reply.post.save(update_fields=["accepted_reply", "status", "updated_at"])
        return Response(status=204)


class CommunityContentReportViewSet(mixins.CreateModelMixin, viewsets.GenericViewSet):
    serializer_class = CommunityContentReportSerializer
    permission_classes = [IsActiveFarmer]

    def get_queryset(self):
        return CommunityContentReport.objects.none()

    def perform_create(self, serializer):
        try:
            serializer.save(reporter=self.request.user)
        except IntegrityError as exc:
            raise serializers.ValidationError(
                "You already have a pending report for this content."
            ) from exc


class CommunityModerationView(APIView):
    permission_classes = [CanModerateCommunity]

    def get(self, request):
        reports = CommunityContentReport.objects.filter(status=CommunityContentReport.Status.PENDING).select_related(
            "post", "reply", "reporter"
        )
        return Response(CommunityContentReportSerializer(reports, many=True).data)

    @transaction.atomic
    def patch(self, request, report_id):
        report = get_object_or_404(CommunityContentReport.objects.select_for_update(), pk=report_id)
        decision = request.data.get("decision")
        if decision not in {"dismiss", "hide"}:
            return Response({"detail": "Decision must be dismiss or hide."}, status=400)
        if decision == "hide":
            if report.post_id:
                report.post.status = CommunityPost.Status.HIDDEN
                report.post.save(update_fields=["status", "updated_at"])
            else:
                report.reply.is_hidden = True
                report.reply.save(update_fields=["is_hidden", "updated_at"])
                if report.reply.post.accepted_reply_id == report.reply_id:
                    report.reply.post.accepted_reply = None
                    report.reply.post.status = CommunityPost.Status.OPEN
                    report.reply.post.save(update_fields=["accepted_reply", "status", "updated_at"])
            report.status = CommunityContentReport.Status.REVIEWED
        else:
            report.status = CommunityContentReport.Status.DISMISSED
        report.reviewed_by = request.user
        report.reviewed_at = timezone.now()
        report.save(update_fields=["status", "reviewed_by", "reviewed_at"])
        return Response(CommunityContentReportSerializer(report).data)
