from datetime import date
from io import StringIO

from django.core.management import CommandError, call_command
from django.db.models import Count
from django.test import TestCase

from .models import MaintenanceRecord, Mechanic, Office, Vehicle


class SeedFleetDataCommandTestCase(TestCase):
    command_options = {
        "seed": 42,
        "offices": 3,
        "vehicles": 12,
        "mechanics": 4,
        "maintenance_records": 30,
    }

    def run_command(self, **options):
        output = StringIO()
        call_command("seed_fleet_data", stdout=output, **options)
        return output.getvalue()

    def test_command_creates_valid_data_and_reports_summary(self):
        output = self.run_command(**self.command_options)

        self.assertEqual(Office.objects.count(), 3)
        self.assertEqual(Vehicle.objects.count(), 12)
        self.assertEqual(Mechanic.objects.count(), 4)
        self.assertEqual(MaintenanceRecord.objects.count(), 30)
        self.assertIn("seed=42", output)
        self.assertEqual(Vehicle.objects.values("vin").distinct().count(), 12)
        self.assertFalse(
            Vehicle.objects.filter(active=True)
            .values("license_plate")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
            .exists()
        )
        self.assertTrue(
            Vehicle.objects.filter(active=False, license_plate__in=Vehicle.objects.filter(active=True).values("license_plate")).exists()
        )
        self.assertTrue(Vehicle.objects.filter(maintenance_records__isnull=True).exists())
        self.assertFalse(MaintenanceRecord.objects.filter(cost__lt=0).exists())
        self.assertFalse(MaintenanceRecord.objects.filter(maintenance_date__gt=date.today()).exists())

    def test_same_seed_and_options_recreate_the_same_vehicle_identifiers(self):
        self.run_command(**self.command_options)
        first_identifiers = list(
            Vehicle.objects.order_by("vin").values_list("vin", "license_plate", "active")
        )

        self.run_command(**self.command_options, clear=True)
        second_identifiers = list(
            Vehicle.objects.order_by("vin").values_list("vin", "license_plate", "active")
        )

        self.assertEqual(first_identifiers, second_identifiers)

    def test_command_requires_clear_before_replacing_existing_data(self):
        self.run_command(**self.command_options)

        with self.assertRaisesMessage(CommandError, "Use --clear to replace it"):
            self.run_command(**self.command_options)

        self.run_command(**self.command_options, clear=True)
        self.assertEqual(Vehicle.objects.count(), 12)

    def test_large_profile_creates_a_vehicle_with_500_maintenance_records(self):
        self.run_command(
            seed=42,
            offices=3,
            vehicles=20,
            mechanics=4,
            maintenance_records=1000,
        )

        self.assertTrue(
            Vehicle.objects.annotate(record_count=Count("maintenance_records"))
            .filter(record_count__gte=500)
            .exists()
        )
