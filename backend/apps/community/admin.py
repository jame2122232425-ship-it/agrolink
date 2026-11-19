from django.contrib import admin

from apps.community.models import CommunityContentReport, CommunityPost, CommunityReaction, CommunityReply


@admin.register(CommunityPost)
class CommunityPostAdmin(admin.ModelAdmin):
    list_display = ("title", "author", "topic", "county", "status", "created_at")
    list_filter = ("topic", "status", "county")
    search_fields = ("title", "body", "author__email")
    readonly_fields = ("author", "created_at", "updated_at")


@admin.register(CommunityReply)
class CommunityReplyAdmin(admin.ModelAdmin):
    list_display = ("post", "author", "is_hidden", "created_at")
    list_filter = ("is_hidden",)
    search_fields = ("body", "author__email", "post__title")


@admin.register(CommunityContentReport)
class CommunityContentReportAdmin(admin.ModelAdmin):
    list_display = ("id", "reason", "status", "reporter", "created_at", "reviewed_by")
    list_filter = ("status", "reason")
    search_fields = ("details", "post__title", "reporter__email")
    readonly_fields = ("reporter", "created_at")


admin.site.register(CommunityReaction)
