from datetime import date, timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase

from .models import MaintenanceRecord, Mechanic, Office, Vehicle


class FleetModelTestCase(TestCase):
    def setUp(self):
        self.office = Office.objects.create(name="Sao Paulo", city="Sao Paulo")
        self.mechanic = Mechanic.objects.create(
            name="Ana Silva",
            certification_number="MECH-001",
        )

    def vehicle(self, *, vin="1HGCM82633A004352", license_plate="ABC123", **kwargs):
        return Vehicle.objects.create(
            vin=vin,
            license_plate=license_plate,
            make="Honda",
            model="Accord",
            year=2020,
            office=self.office,
            **kwargs,
        )

    def maintenance_record(self, **kwargs):
        vehicle = kwargs.pop("vehicle", None) or self.vehicle()
        mechanic = kwargs.pop("mechanic", None) or self.mechanic
        values = {
            "vehicle": vehicle,
            "mechanic": mechanic,
            "maintenance_date": date.today(),
            "maintenance_type": "Inspection",
            "cost": Decimal("100.00"),
        }
        values.update(kwargs)
        return MaintenanceRecord(**values)

    def assert_database_integrity_error(self, callback):
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                callback()

    def test_vin_is_canonicalized_and_unique(self):
        vehicle = self.vehicle(vin=" 1hgcm82633a004352 ")

        self.assertEqual(vehicle.vin, "1HGCM82633A004352")
        self.assert_database_integrity_error(
            lambda: self.vehicle(vin="1HGCM82633A004352", license_plate="XYZ987")
        )

    def test_active_vehicles_cannot_share_a_canonical_license_plate(self):
        self.vehicle(license_plate=" abc123 ")

        self.assert_database_integrity_error(
            lambda: self.vehicle(vin="2HGCM82633A004352", license_plate="ABC123")
        )

    def test_inactive_vehicles_may_share_a_license_plate(self):
        self.vehicle(active=False)
        second = self.vehicle(vin="2HGCM82633A004352", active=False)

        self.assertEqual(second.license_plate, "ABC123")

    def test_inactive_vehicle_may_share_a_plate_with_an_active_vehicle(self):
        self.vehicle()
        inactive_vehicle = self.vehicle(
            vin="2HGCM82633A004352",
            license_plate="abc123",
            active=False,
        )

        self.assertEqual(inactive_vehicle.license_plate, "ABC123")

    def test_reactivating_vehicle_with_active_plate_conflict_is_rejected(self):
        self.vehicle()
        inactive_vehicle = self.vehicle(vin="2HGCM82633A004352", active=False)
        inactive_vehicle.active = True

        self.assert_database_integrity_error(inactive_vehicle.save)
        inactive_vehicle.refresh_from_db()
        self.assertFalse(inactive_vehicle.active)

    def test_changing_active_vehicle_plate_to_an_active_plate_is_rejected(self):
        self.vehicle()
        second = self.vehicle(vin="2HGCM82633A004352", license_plate="XYZ987")
        second.license_plate = "abc123"

        self.assert_database_integrity_error(second.save)
        second.refresh_from_db()
        self.assertEqual(second.license_plate, "XYZ987")

    def test_zero_and_positive_maintenance_costs_are_accepted(self):
        zero_cost = self.maintenance_record(cost=Decimal("0.00"))
        zero_cost.full_clean()
        zero_cost.save()

        positive_cost = self.maintenance_record(
            vehicle=self.vehicle(vin="2HGCM82633A004352", license_plate="XYZ987"),
            cost=Decimal("25.50"),
        )
        positive_cost.full_clean()
        positive_cost.save()

        self.assertEqual(MaintenanceRecord.objects.count(), 2)

    def test_negative_maintenance_cost_is_rejected_by_validation_and_database(self):
        record = self.maintenance_record(cost=Decimal("-0.01"))

        with self.assertRaises(ValidationError):
            record.full_clean()
        self.assert_database_integrity_error(record.save)

    def test_past_and_current_maintenance_dates_are_accepted(self):
        past_record = self.maintenance_record(
            maintenance_date=date.today() - timedelta(days=1)
        )
        past_record.full_clean()

        current_record = self.maintenance_record(
            vehicle=self.vehicle(vin="2HGCM82633A004352", license_plate="XYZ987"),
            maintenance_date=date.today(),
        )
        current_record.full_clean()

    def test_future_maintenance_date_is_rejected(self):
        record = self.maintenance_record(maintenance_date=date.today() + timedelta(days=1))

        with self.assertRaises(ValidationError) as error:
            record.full_clean()

        self.assertIn("maintenance_date", error.exception.message_dict)

    def test_relationship_related_names(self):
        vehicle = self.vehicle()
        record = self.maintenance_record(vehicle=vehicle)
        record.full_clean()
        record.save()

        self.assertEqual(list(self.office.vehicles.all()), [vehicle])
        self.assertEqual(list(vehicle.maintenance_records.all()), [record])
        self.assertEqual(list(self.mechanic.maintenance_records.all()), [record])
