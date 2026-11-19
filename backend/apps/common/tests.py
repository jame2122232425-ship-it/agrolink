from django.test import SimpleTestCase
from django.urls import reverse


class LandingPageTests(SimpleTestCase):
    def test_root_renders_agrolink_landing_page(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, "landing.html")
        self.assertContains(response, "A stronger season starts with")
        self.assertContains(response, reverse("health"))
        self.assertContains(response, reverse("admin:index"))
        self.assertContains(response, reverse("staff:login"))
