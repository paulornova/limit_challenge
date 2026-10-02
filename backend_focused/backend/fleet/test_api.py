from datetime import date, timedelta
from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import MaintenanceRecord, Mechanic, Office, Vehicle


class FleetCrudApiTestCase(APITestCase):
    def setUp(self):
        self.office = Office.objects.create(name="Sao Paulo", city="Sao Paulo")
        self.mechanic = Mechanic.objects.create(
            name="Ana Silva", certification_number="MECH-001"
        )

    def vehicle(self, **kwargs):
        values = {
            "vin": "1HGCM82633A004352",
            "license_plate": "ABC123",
            "make": "Honda",
            "model": "Accord",
            "year": 2020,
            "office": self.office,
        }
        values.update(kwargs)
        return Vehicle.objects.create(**values)

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
        return MaintenanceRecord.objects.create(**values)

    def test_office_crud_and_protected_delete(self):
        response = self.client.post(
            reverse("office-list"),
            {"name": "Rio", "city": "Rio de Janeiro"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        office_id = response.data["id"]

        response = self.client.get(reverse("office-detail", args=[office_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.patch(
            reverse("office-detail", args=[office_id]),
            {"city": "Niteroi"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["city"], "Niteroi")

        response = self.client.delete(reverse("office-detail", args=[office_id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        protected_office = Office.objects.create(name="Curitiba", city="Curitiba")
        self.vehicle(office=protected_office)
        response = self.client.delete(reverse("office-detail", args=[protected_office.pk]))
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("cannot be deleted", response.data["detail"])

    def test_vehicle_crud_and_canonicalization(self):
        response = self.client.post(
            reverse("vehicle-list"),
            {
                "vin": " 1hgcm82633a004352 ",
                "license_plate": " abc123 ",
                "make": "Honda",
                "model": "Accord",
                "year": 2020,
                "office": self.office.pk,
                "active": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["vin"], "1HGCM82633A004352")
        self.assertEqual(response.data["license_plate"], "ABC123")
        vehicle_id = response.data["id"]

        response = self.client.get(reverse("vehicle-detail", args=[vehicle_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.patch(
            reverse("vehicle-detail", args=[vehicle_id]),
            {"model": "Civic"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["model"], "Civic")

        response = self.client.delete(reverse("vehicle-detail", args=[vehicle_id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_vehicle_conflicts_and_inactive_duplicate_plate(self):
        self.vehicle()
        duplicate_vin = self.client.post(
            reverse("vehicle-list"),
            {
                "vin": "1hgcm82633a004352",
                "license_plate": "XYZ987",
                "make": "Honda",
                "model": "Civic",
                "year": 2020,
                "office": self.office.pk,
                "active": True,
            },
            format="json",
        )
        self.assertEqual(duplicate_vin.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("vin", duplicate_vin.data)

        duplicate_plate = self.client.post(
            reverse("vehicle-list"),
            {
                "vin": "2HGCM82633A004352",
                "license_plate": "abc123",
                "make": "Honda",
                "model": "Civic",
                "year": 2020,
                "office": self.office.pk,
                "active": True,
            },
            format="json",
        )
        self.assertEqual(duplicate_plate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("license_plate", duplicate_plate.data)

        inactive_duplicate = self.client.post(
            reverse("vehicle-list"),
            {
                "vin": "2HGCM82633A004352",
                "license_plate": "abc123",
                "make": "Honda",
                "model": "Civic",
                "year": 2020,
                "office": self.office.pk,
                "active": False,
            },
            format="json",
        )
        self.assertEqual(inactive_duplicate.status_code, status.HTTP_201_CREATED)

        inactive_update = self.client.patch(
            reverse("vehicle-detail", args=[inactive_duplicate.data["id"]]),
            {
                "vin": inactive_duplicate.data["vin"],
                "license_plate": inactive_duplicate.data["license_plate"],
                "make": inactive_duplicate.data["make"],
                "model": "Updated Civic",
                "year": inactive_duplicate.data["year"],
                "office": inactive_duplicate.data["office"],
                "active": False,
            },
            format="json",
        )
        self.assertEqual(inactive_update.status_code, status.HTTP_200_OK)
        self.assertFalse(inactive_update.data["active"])
        self.assertEqual(inactive_update.data["model"], "Updated Civic")

        reactivation = self.client.patch(
            reverse("vehicle-detail", args=[inactive_duplicate.data["id"]]),
            {"active": True},
            format="json",
        )
        self.assertEqual(reactivation.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("license_plate", reactivation.data)

    def test_vehicle_delete_is_protected_by_maintenance_history(self):
        vehicle = self.vehicle()
        self.maintenance_record(vehicle=vehicle)

        response = self.client.delete(reverse("vehicle-detail", args=[vehicle.pk]))

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_mechanic_crud_allows_duplicate_certification_and_protects_history(self):
        response = self.client.post(
            reverse("mechanic-list"),
            {"name": "Bruno", "certification_number": "MECH-001", "active": True},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        mechanic_id = response.data["id"]

        response = self.client.get(reverse("mechanic-detail", args=[mechanic_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.patch(
            reverse("mechanic-detail", args=[mechanic_id]),
            {"active": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.delete(reverse("mechanic-detail", args=[mechanic_id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        self.maintenance_record()
        response = self.client.delete(reverse("mechanic-detail", args=[self.mechanic.pk]))
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_maintenance_record_crud_and_validation(self):
        vehicle = self.vehicle()
        payload = {
            "vehicle": vehicle.pk,
            "mechanic": self.mechanic.pk,
            "maintenance_date": str(date.today()),
            "maintenance_type": "Inspection",
            "cost": "0.00",
            "notes": "Initial service",
        }
        response = self.client.post(
            reverse("maintenancerecord-list"), payload, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        record_id = response.data["id"]
        self.assertEqual(response.data["cost"], "0.00")

        response = self.client.get(reverse("maintenancerecord-detail", args=[record_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.patch(
            reverse("maintenancerecord-detail", args=[record_id]),
            {"notes": "Completed"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.post(
            reverse("maintenancerecord-list"),
            {**payload, "cost": "-0.01"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cost", response.data)

        response = self.client.post(
            reverse("maintenancerecord-list"),
            {
                **payload,
                "maintenance_date": str(date.today() + timedelta(days=1)),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("maintenance_date", response.data)

        response = self.client.delete(reverse("maintenancerecord-detail", args=[record_id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_missing_resource_returns_not_found(self):
        response = self.client.get(reverse("office-detail", args=[999999]))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
