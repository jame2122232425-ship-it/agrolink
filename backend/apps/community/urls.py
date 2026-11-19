from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.community.views import (
    CommunityContentReportViewSet,
    CommunityModerationView,
    CommunityPostViewSet,
    CommunityReplyDeleteView,
    CommunityReplyListCreateView,
)

router = DefaultRouter()
router.register("posts", CommunityPostViewSet, basename="community-post")
router.register("reports", CommunityContentReportViewSet, basename="community-report")

urlpatterns = [
    path("moderation/reports/", CommunityModerationView.as_view(), name="community-moderation"),
    path("moderation/reports/<int:report_id>/", CommunityModerationView.as_view(), name="community-moderation-detail"),
    path("posts/<int:post_id>/replies/", CommunityReplyListCreateView.as_view(), name="community-replies"),
    path("replies/<int:reply_id>/", CommunityReplyDeleteView.as_view(), name="community-reply-detail"),
    path("", include(router.urls)),
]
