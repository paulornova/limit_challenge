from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Office, Vehicle


class FleetMutationApiTestCase(APITestCase):
    def setUp(self):
        self.office = Office.objects.create(name="Sao Paulo", city="Sao Paulo")
        self.other_office = Office.objects.create(name="Rio", city="Rio de Janeiro")
        self._vehicle_number = 1

    def vehicle(self, **kwargs):
        number = self._vehicle_number
        self._vehicle_number += 1
        values = {
            "vin": f"1HGCM82633A00{number:04d}",
            "license_plate": f"PLT{number:04d}",
            "make": "Honda",
            "model": "Accord",
            "year": 2020,
            "office": self.office,
            "active": True,
        }
        values.update(kwargs)
        return Vehicle.objects.create(**values)

    def test_vehicle_reassignment_changes_only_office(self):
        vehicle = self.vehicle()
        original_values = {
            "vin": vehicle.vin,
            "license_plate": vehicle.license_plate,
            "make": vehicle.make,
            "model": vehicle.model,
            "year": vehicle.year,
            "active": vehicle.active,
        }

        response = self.client.patch(
            reverse("vehicle-reassign", args=[vehicle.pk]),
            {"office": self.other_office.pk},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["office"], self.other_office.pk)
        vehicle.refresh_from_db()
        self.assertEqual(vehicle.office_id, self.other_office.pk)
        for field, value in original_values.items():
            self.assertEqual(getattr(vehicle, field), value)

    def test_vehicle_reassignment_validates_vehicle_and_office(self):
        vehicle = self.vehicle()
        for payload in ({}, {"office": 999999}, {"office": "not-an-id"}):
            response = self.client.patch(
                reverse("vehicle-reassign", args=[vehicle.pk]), payload, format="json"
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("office", response.data)

        response = self.client.patch(
            reverse("vehicle-reassign", args=[999999]),
            {"office": self.other_office.pk},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_duplicate_check_reports_no_conflicts_and_preserves_database_state(self):
        self.vehicle(vin="1HGCM82633A004352", license_plate="ABC123")
        before_count = Vehicle.objects.count()

        with self.assertNumQueries(2):
            response = self.client.get(
                reverse("vehicle-duplicate-check"),
                {"vin": " 2hgcm82633a004352 ", "license_plate": " xyz987 "},
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"conflicts": []})
        self.assertEqual(Vehicle.objects.count(), before_count)

    def test_duplicate_check_reports_vin_plate_and_both_conflicts_with_normalization(self):
        vin_vehicle = self.vehicle(vin="1HGCM82633A004352", license_plate="VIN123")
        plate_vehicle = self.vehicle(vin="2HGCM82633A004352", license_plate="PLATE123")

        response = self.client.get(
            reverse("vehicle-duplicate-check"),
            {"vin": " 1hgcm82633a004352 ", "license_plate": "new123"},
        )
        self.assertEqual(response.data, {"conflicts": ["vin"]})

        response = self.client.get(
            reverse("vehicle-duplicate-check"),
            {"vin": "newvin", "license_plate": " plate123 "},
        )
        self.assertEqual(response.data, {"conflicts": ["license_plate"]})

        response = self.client.get(
            reverse("vehicle-duplicate-check"),
            {"vin": vin_vehicle.vin.lower(), "license_plate": plate_vehicle.license_plate.lower()},
        )
        self.assertEqual(response.data, {"conflicts": ["vin", "license_plate"]})

    def test_duplicate_check_ignores_inactive_only_plate_matches(self):
        self.vehicle(license_plate="HIST123", active=False)

        response = self.client.get(
            reverse("vehicle-duplicate-check"),
            {"vin": "newvin", "license_plate": " hist123 "},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"conflicts": []})

    def test_duplicate_check_requires_nonblank_vin_and_license_plate(self):
        invalid_parameters = (
            {"license_plate": "ABC123"},
            {"vin": "1HGCM82633A004352"},
            {"vin": "   ", "license_plate": "ABC123"},
            {"vin": "1HGCM82633A004352", "license_plate": "  "},
        )

        for parameters in invalid_parameters:
            response = self.client.get(reverse("vehicle-duplicate-check"), parameters)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
