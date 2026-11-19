from time import monotonic

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai_assistant.models import Conversation, Message
from apps.ai_assistant.permissions import IsFarmer
from apps.ai_assistant.serializers import (
    ConversationDetailSerializer,
    ConversationSerializer,
    MessageSerializer,
    SendMessageSerializer,
)
from apps.ai_assistant.services import (
    AIServiceError,
    ai_status,
    generate_reply,
    list_conversations,
    record_usage,
)
from apps.ai_assistant.providers import AIProviderError
from apps.common.permissions import IsActiveAccount


class AIStatusView(APIView):
    permission_classes = [IsAuthenticated, IsActiveAccount, IsFarmer]

    def get(self, _request):
        return Response(ai_status())


class ConversationListCreateView(generics.ListCreateAPIView):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated, IsActiveAccount, IsFarmer]

    def get_queryset(self):
        return list_conversations(self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class ConversationDetailView(generics.RetrieveAPIView):
    serializer_class = ConversationDetailSerializer
    permission_classes = [IsAuthenticated, IsActiveAccount, IsFarmer]

    def get_queryset(self):
        return list_conversations(self.request.user).prefetch_related("messages")


class ConversationMessagesView(APIView):
    permission_classes = [IsAuthenticated, IsActiveAccount, IsFarmer]

    def post(self, request, pk):
        conversation = get_object_or_404(
            Conversation.objects.filter(owner=request.user), pk=pk
        )
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        image = serializer.validated_data.get("image")
        content = serializer.validated_data["content"] or (
            "Please review the attached image and share what you can observe."
        )
        user_message = Message.objects.create(
            conversation=conversation,
            role=Message.Role.USER,
            content=content,
            image=image,
        )
        if conversation.title == "New consultation":
            conversation.title = user_message.content[:97].strip()
            if len(user_message.content) > 97:
                conversation.title += "..."
            conversation.save(update_fields=["title", "updated_at"])
        else:
            conversation.save(update_fields=["updated_at"])

        started = monotonic()
        try:
            reply = generate_reply(
                conversation, request.user, image_message=user_message
            )
        except (AIServiceError, AIProviderError) as error:
            duration_ms = int((monotonic() - started) * 1000)
            record_usage(
                user=request.user,
                conversation=conversation,
                provider="mock" if settings.AI_MOCK_MODE else settings.AI_PROVIDER,
                succeeded=False,
                duration_ms=duration_ms,
                error_code=error.code,
            )
            response_status = (
                status.HTTP_503_SERVICE_UNAVAILABLE
                if error.code in {
                    "ai_disabled",
                    "provider_not_configured",
                    "provider_unavailable",
                    "timeout",
                    "rate_limited",
                    "unavailable",
                }
                else status.HTTP_502_BAD_GATEWAY
            )
            return Response(
                {"code": error.code, "detail": str(error)},
                status=response_status,
            )

        duration_ms = int((monotonic() - started) * 1000)
        assistant_message = Message.objects.create(
            conversation=conversation,
            role=Message.Role.ASSISTANT,
            content=reply.text,
            is_demo=reply.is_demo,
        )
        conversation.save(update_fields=["updated_at"])
        record_usage(
            user=request.user,
            conversation=conversation,
            provider="mock" if reply.is_demo else "gemini",
            succeeded=True,
            duration_ms=duration_ms,
            input_tokens=reply.input_tokens,
            output_tokens=reply.output_tokens,
        )
        return Response(
            {
                "user_message": user_message.id,
                "assistant_message": MessageSerializer(
                    assistant_message, context={"request": request}
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )
