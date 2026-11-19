from django.contrib.auth.backends import ModelBackend


class ActiveAccountBackend(ModelBackend):
    def user_can_authenticate(self, user):
        return super().user_can_authenticate(user) and user.account_status == user.AccountStatus.ACTIVE
