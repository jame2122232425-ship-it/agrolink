from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import Group, PermissionsMixin
from django.db import models
from django.utils.text import slugify

from apps.common.storage import private_media_storage


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        email = self.normalize_email(email).strip().lower()
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.PLATFORM_ADMIN)
        extra_fields.setdefault("account_status", User.AccountStatus.ACTIVE)
        if not extra_fields["is_staff"] or not extra_fields["is_superuser"]:
            raise ValueError("A superuser must have is_staff=True and is_superuser=True.")
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        FARMER = "farmer", "Farmer"
        AGRICULTURAL_OFFICER = "agricultural_officer", "Agricultural extension officer"
        VETERINARY_OFFICER = "veterinary_officer", "Veterinary officer"
        AGRONOMIST = "agronomist", "Agronomist"
        FIELD_AGENT = "field_agent", "Field agent"
        STAFF = "staff", "Staff"
        PLATFORM_ADMIN = "platform_admin", "Super Admin"

    class AccountStatus(models.TextChoices):
        ACTIVE = "active", "Active"
        PENDING = "pending", "Pending approval"
        SUSPENDED = "suspended", "Suspended"

    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    phone_number = models.CharField(max_length=32, blank=True)
    role = models.CharField(max_length=32, choices=Role.choices, default=Role.FARMER)
    account_status = models.CharField(
        max_length=16, choices=AccountStatus.choices, default=AccountStatus.ACTIVE
    )
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        ordering = ["-date_joined"]
        permissions = [
            ("coordinate_cases", "Can coordinate agricultural cases"),
            ("view_farmer_accounts", "Can view farmer accounts"),
            ("manage_farmer_accounts", "Can manage farmer account status"),
            ("view_professional_accounts", "Can view professional accounts"),
            ("manage_professional_accounts", "Can manage professional account status"),
            ("manage_staff_permissions", "Can manage delegated staff permissions"),
            ("view_farm_oversight", "Can view farm, crop, and livestock oversight data"),
            ("manage_reference_data", "Can manage agricultural reference data"),
            ("view_operational_reports", "Can view operational reports"),
            ("view_admin_audit_log", "Can view platform administration audit log"),
            ("manage_community_content", "Can review and moderate farmer community content"),
        ]

    def __str__(self):
        return self.email

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self):
        return self.first_name


class Role(models.Model):
    """RBAC role that wraps a Django Group.

    Keeping the Django Group as the permission carrier means ``user.has_perm``,
    ``perms.*`` template checks, and the existing delegated-group logic all keep
    working unchanged while platform administrators edit roles by name.
    """

    group = models.OneToOneField(
        Group,
        on_delete=models.CASCADE,
        related_name="platform_role",
    )
    slug = models.SlugField(max_length=80, unique=True)
    description = models.TextField(blank=True)
    is_system = models.BooleanField(
        default=False,
        help_text="System roles cannot be renamed or deleted.",
    )
    is_assignable = models.BooleanField(
        default=True,
        help_text="Assignable roles can be given to Staff accounts.",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["group__name"]
        verbose_name = "role"
        verbose_name_plural = "roles"

    def __str__(self):
        return self.name

    @property
    def name(self):
        return self.group.name

    @property
    def permission_codenames(self):
        return set(
            self.group.permissions.values_list("codename", flat=True)
        )

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.group.name)[:80]
        super().save(*args, **kwargs)


class FarmerProfile(models.Model):
    class PreferredLanguage(models.TextChoices):
        ENGLISH = "en", "English"
        KISWAHILI = "sw", "Kiswahili"

    user = models.OneToOneField(
        "accounts.User", on_delete=models.CASCADE, related_name="farmer_profile"
    )
    county = models.CharField(max_length=100, blank=True)
    sub_county = models.CharField(max_length=100, blank=True)
    ward = models.CharField(max_length=100, blank=True)
    village = models.CharField(max_length=100, blank=True)
    preferred_language = models.CharField(
        max_length=2, choices=PreferredLanguage.choices, default=PreferredLanguage.ENGLISH
    )
    contact_phone = models.CharField(max_length=32, blank=True)
    profile_information = models.TextField(blank=True)
    profile_picture = models.ImageField(
        storage=private_media_storage,
        upload_to="accounts/profile-pictures/",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Farmer profile: {self.user.email}"
