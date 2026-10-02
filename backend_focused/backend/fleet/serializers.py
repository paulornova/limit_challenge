from datetime import date

from django.db import IntegrityError, transaction
from rest_framework import serializers

from .models import MaintenanceRecord, Mechanic, Office, Vehicle


class OfficeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Office
        fields = ["id", "name", "city"]


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = [
            "id",
            "vin",
            "license_plate",
            "make",
            "model",
            "year",
            "office",
            "active",
        ]
        extra_kwargs = {"vin": {"validators": []}}

    def validate_vin(self, value):
        return value.strip().upper()

    def validate_license_plate(self, value):
        return value.strip().upper()

    def validate(self, attrs):
        instance = self.instance
        vin = attrs.get("vin", instance.vin if instance else None)
        license_plate = attrs.get(
            "license_plate", instance.license_plate if instance else None
        )
        active = attrs.get("active", instance.active if instance else True)
        existing_vehicles = Vehicle.objects.all()
        if instance:
            existing_vehicles = existing_vehicles.exclude(pk=instance.pk)

        errors = {}
        if existing_vehicles.filter(vin=vin).exists():
            errors["vin"] = "A vehicle with this VIN already exists."
        if active and existing_vehicles.filter(
            license_plate=license_plate, active=True
        ).exists():
            errors["license_plate"] = (
                "An active vehicle already uses this license plate."
            )
        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        return self._save_with_integrity_error(super().create, validated_data)

    def update(self, instance, validated_data):
        return self._save_with_integrity_error(super().update, instance, validated_data)

    @staticmethod
    def _save_with_integrity_error(save_method, *args):
        try:
            with transaction.atomic():
                return save_method(*args)
        except IntegrityError as error:
            raise serializers.ValidationError(
                {
                    "non_field_errors": [
                        "Vehicle VIN or active license plate conflicts with an existing vehicle."
                    ]
                }
            ) from error


class MechanicSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mechanic
        fields = ["id", "name", "certification_number", "active"]


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceRecord
        fields = [
            "id",
            "vehicle",
            "mechanic",
            "maintenance_date",
            "maintenance_type",
            "cost",
            "notes",
        ]

    def validate_cost(self, value):
        if value < 0:
            raise serializers.ValidationError("Cost must be non-negative.")
        return value

    def validate_maintenance_date(self, value):
        if value > date.today():
            raise serializers.ValidationError("Maintenance date cannot be in the future.")
        return value
