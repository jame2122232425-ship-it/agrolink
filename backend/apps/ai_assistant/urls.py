from django.urls import path

from apps.ai_assistant.views import (
    AIStatusView,
    ConversationDetailView,
    ConversationListCreateView,
    ConversationMessagesView,
)


urlpatterns = [
    path("status/", AIStatusView.as_view(), name="ai-status"),
    path("conversations/", ConversationListCreateView.as_view(), name="ai-conversation-list"),
    path(
        "conversations/<int:pk>/",
        ConversationDetailView.as_view(),
        name="ai-conversation-detail",
    ),
    path(
        "conversations/<int:pk>/messages/",
        ConversationMessagesView.as_view(),
        name="ai-conversation-messages",
    ),
]
