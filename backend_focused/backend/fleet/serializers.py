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
        extra_kwargs = {
            "vin": {"validators": []},
            "license_plate": {"validators": []},
        }

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


class OfficeReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Office
        fields = ["id", "name", "city"]


class MechanicReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mechanic
        fields = ["id", "name", "certification_number", "active"]


class MaintenanceHistorySerializer(serializers.ModelSerializer):
    mechanic = MechanicReadSerializer(read_only=True)

    class Meta:
        model = MaintenanceRecord
        fields = [
            "id",
            "maintenance_date",
            "maintenance_type",
            "cost",
            "notes",
            "mechanic",
        ]


class VehicleDetailSerializer(serializers.ModelSerializer):
    office = OfficeReadSerializer(read_only=True)
    maintenance_records = MaintenanceHistorySerializer(many=True, read_only=True)

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
            "maintenance_records",
        ]


class OfficeSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    city = serializers.CharField()
    active_vehicle_count = serializers.IntegerField()
    maintenance_cost_last_year = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False
    )
    last_maintenance = serializers.DateField(allow_null=True)


class MechanicWorkloadSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    certification_number = serializers.CharField()
    maintenance_count_current_year = serializers.IntegerField()
    maintenance_cost_current_year = serializers.DecimalField(
        max_digits=12, decimal_places=2, coerce_to_string=False
    )


class VehicleNeedingMaintenanceSerializer(VehicleSerializer):
    last_maintenance = serializers.DateField(read_only=True, allow_null=True)

    class Meta(VehicleSerializer.Meta):
        fields = [*VehicleSerializer.Meta.fields, "last_maintenance"]


class VehicleReassignmentSerializer(serializers.Serializer):
    office = serializers.PrimaryKeyRelatedField(queryset=Office.objects.all())
