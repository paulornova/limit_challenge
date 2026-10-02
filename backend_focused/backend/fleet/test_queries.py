from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from .models import MaintenanceRecord, Mechanic, Office, Vehicle
from .views import calendar_year_ago


class FleetQueryApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.office = Office.objects.create(name="Sao Paulo", city="Sao Paulo")
        self.mechanic = Mechanic.objects.create(
            name="Ana Silva", certification_number="MECH-001"
        )
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

    def record(self, **kwargs):
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

    def list_ids(self, response):
        return [item["id"] for item in response.data["results"]]

    def test_office_summary_aggregates_without_vehicle_row_multiplication(self):
        empty_office = Office.objects.create(name="Recife", city="Recife")
        active_one = self.vehicle()
        active_two = self.vehicle()
        inactive = self.vehicle(active=False)
        last_year_start = calendar_year_ago(date.today())
        self.record(
            vehicle=active_one,
            maintenance_date=last_year_start,
            cost=Decimal("100.00"),
        )
        self.record(
            vehicle=active_one,
            maintenance_date=date.today(),
            cost=Decimal("50.00"),
        )
        self.record(
            vehicle=active_two,
            maintenance_date=last_year_start - timedelta(days=1),
            cost=Decimal("999.00"),
        )
        self.record(
            vehicle=inactive,
            maintenance_date=date.today() - timedelta(days=1),
            cost=Decimal("25.00"),
        )

        response = self.client.get(reverse("office-summary"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        summaries = {summary["id"]: summary for summary in response.data}
        summary = summaries[self.office.pk]
        self.assertEqual(summary["active_vehicle_count"], 2)
        self.assertEqual(summary["maintenance_cost_last_year"], 175.0)
        self.assertEqual(summary["last_maintenance"], str(date.today()))
        self.assertEqual(summaries[empty_office.pk]["active_vehicle_count"], 0)
        self.assertEqual(summaries[empty_office.pk]["maintenance_cost_last_year"], 0.0)
        self.assertIsNone(summaries[empty_office.pk]["last_maintenance"])

    def test_office_summary_query_count_is_constant(self):
        for number in range(3):
            office = Office.objects.create(name=f"Office {number}", city="City")
            self.vehicle(office=office)

        with self.assertNumQueries(1):
            response = self.client.get(reverse("office-summary"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_vehicle_search_filters_and_same_record_semantics(self):
        second_office = Office.objects.create(name="Rio", city="Rio de Janeiro")
        certified_mechanic = Mechanic.objects.create(
            name="Bruno", certification_number="MECH-002"
        )
        other_mechanic = Mechanic.objects.create(
            name="Carla", certification_number="MECH-003"
        )
        matching_vehicle = self.vehicle(make="Honda", model="Civic")
        other_vehicle = self.vehicle(
            office=second_office,
            make="Toyota",
            model="Corolla",
            active=False,
        )
        split_match_vehicle = self.vehicle(make="Honda", model="Pilot")
        recent_date = date.today() - timedelta(days=10)
        old_date = date.today() - timedelta(days=400)
        self.record(
            vehicle=matching_vehicle,
            mechanic=certified_mechanic,
            maintenance_date=recent_date,
        )
        self.record(
            vehicle=matching_vehicle,
            mechanic=certified_mechanic,
            maintenance_date=recent_date - timedelta(days=1),
        )
        self.record(
            vehicle=other_vehicle,
            mechanic=other_mechanic,
            maintenance_date=recent_date,
        )
        self.record(
            vehicle=split_match_vehicle,
            mechanic=certified_mechanic,
            maintenance_date=old_date,
        )
        self.record(
            vehicle=split_match_vehicle,
            mechanic=other_mechanic,
            maintenance_date=recent_date,
        )

        response = self.client.get(reverse("vehicle-list"), {"office": self.office.pk})
        self.assertEqual(set(self.list_ids(response)), {matching_vehicle.pk, split_match_vehicle.pk})

        response = self.client.get(reverse("vehicle-list"), {"active": "false"})
        self.assertEqual(self.list_ids(response), [other_vehicle.pk])

        response = self.client.get(reverse("vehicle-list"), {"make": "Honda", "model": "Civic"})
        self.assertEqual(self.list_ids(response), [matching_vehicle.pk])

        response = self.client.get(
            reverse("vehicle-list"),
            {
                "maintenance_date_from": str(recent_date),
                "maintenance_date_to": str(recent_date),
                "mechanic_certification_number": certified_mechanic.certification_number,
            },
        )
        self.assertEqual(self.list_ids(response), [matching_vehicle.pk])

    def test_vehicle_search_rejects_invalid_parameters(self):
        for parameters in (
            {"active": "sometimes"},
            {"maintenance_date_from": "not-a-date"},
            {
                "maintenance_date_from": str(date.today()),
                "maintenance_date_to": str(date.today() - timedelta(days=1)),
            },
        ):
            response = self.client.get(reverse("vehicle-list"), parameters)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_vehicle_detail_has_complete_ordered_nested_history_in_two_queries(self):
        vehicle = self.vehicle()
        other_mechanic = Mechanic.objects.create(
            name="Bruno", certification_number="MECH-002"
        )
        oldest = self.record(
            vehicle=vehicle,
            mechanic=self.mechanic,
            maintenance_date=date.today() - timedelta(days=2),
        )
        same_day_first = self.record(
            vehicle=vehicle,
            mechanic=self.mechanic,
            maintenance_date=date.today() - timedelta(days=1),
        )
        same_day_second = self.record(
            vehicle=vehicle,
            mechanic=other_mechanic,
            maintenance_date=date.today() - timedelta(days=1),
        )

        with self.assertNumQueries(2):
            response = self.client.get(reverse("vehicle-detail", args=[vehicle.pk]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["office"]["id"], self.office.pk)
        self.assertEqual(
            [record["id"] for record in response.data["maintenance_records"]],
            [same_day_second.pk, same_day_first.pk, oldest.pk],
        )
        self.assertEqual(
            response.data["maintenance_records"][0]["mechanic"]["id"], other_mechanic.pk
        )

        for _ in range(5):
            self.record(vehicle=vehicle, mechanic=self.mechanic)
        with self.assertNumQueries(2):
            response = self.client.get(reverse("vehicle-detail", args=[vehicle.pk]))
        self.assertEqual(len(response.data["maintenance_records"]), 8)

    def test_vehicle_maintenance_history_is_ordered_scoped_and_returns_not_found(self):
        vehicle = self.vehicle()
        other_vehicle = self.vehicle()
        oldest = self.record(vehicle=vehicle, maintenance_date=date.today() - timedelta(days=2))
        newest = self.record(vehicle=vehicle, maintenance_date=date.today() - timedelta(days=1))
        self.record(vehicle=other_vehicle)

        response = self.client.get(reverse("vehicle-maintenance-history", args=[vehicle.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([record["id"] for record in response.data], [newest.pk, oldest.pk])
        self.assertEqual(response.data[0]["mechanic"]["id"], self.mechanic.pk)

        response = self.client.get(reverse("vehicle-maintenance-history", args=[999999]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_mechanic_workload_uses_current_year_and_constant_queries(self):
        second = Mechanic.objects.create(name="Bruno", certification_number="MECH-002")
        idle = Mechanic.objects.create(name="Carla", certification_number="MECH-003")
        vehicle = self.vehicle()
        self.record(vehicle=vehicle, mechanic=self.mechanic, cost=Decimal("10.00"))
        self.record(vehicle=vehicle, mechanic=self.mechanic, cost=Decimal("20.00"))
        self.record(vehicle=vehicle, mechanic=second, cost=Decimal("100.00"))
        self.record(
            vehicle=vehicle,
            mechanic=second,
            maintenance_date=date.today().replace(year=date.today().year - 1),
            cost=Decimal("999.00"),
        )

        with self.assertNumQueries(1):
            response = self.client.get(reverse("mechanic-workload"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        workload = {entry["id"]: entry for entry in response.data}
        self.assertEqual(workload[self.mechanic.pk]["maintenance_count_current_year"], 2)
        self.assertEqual(workload[self.mechanic.pk]["maintenance_cost_current_year"], 30.0)
        self.assertEqual(workload[second.pk]["maintenance_count_current_year"], 1)
        self.assertEqual(workload[second.pk]["maintenance_cost_current_year"], 100.0)
        self.assertEqual(workload[idle.pk]["maintenance_count_current_year"], 0)
        self.assertEqual(workload[idle.pk]["maintenance_cost_current_year"], 0.0)
        self.assertEqual([entry["id"] for entry in response.data], [self.mechanic.pk, second.pk, idle.pk])

    def test_vehicles_needing_maintenance_handles_boundary_ordering_and_query_count(self):
        never_maintained = self.vehicle()
        inactive_never_maintained = self.vehicle(active=False)
        old_vehicle = self.vehicle()
        boundary_vehicle = self.vehicle()
        recent_vehicle = self.vehicle()
        cutoff = date.today() - timedelta(days=365)
        self.record(vehicle=old_vehicle, maintenance_date=cutoff - timedelta(days=1))
        self.record(vehicle=boundary_vehicle, maintenance_date=cutoff)
        self.record(vehicle=recent_vehicle, maintenance_date=date.today() - timedelta(days=1))

        with self.assertNumQueries(1):
            response = self.client.get(reverse("vehicle-needing-maintenance"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [vehicle["id"] for vehicle in response.data],
            [never_maintained.pk, old_vehicle.pk],
        )
        self.assertIsNone(response.data[0]["last_maintenance"])
        self.assertEqual(
            response.data[1]["last_maintenance"], str(cutoff - timedelta(days=1))
        )
        self.assertNotIn(inactive_never_maintained.pk, [vehicle["id"] for vehicle in response.data])
        self.assertNotIn(boundary_vehicle.pk, [vehicle["id"] for vehicle in response.data])
        self.assertNotIn(recent_vehicle.pk, [vehicle["id"] for vehicle in response.data])
