
from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


class Office(models.Model):
    name = models.CharField(max_length=255)
    city = models.CharField(max_length=255)

    def __str__(self):
        return f"{self.name} ({self.city})"


class Vehicle(models.Model):
    vin = models.CharField(max_length=17, unique=True)
    license_plate = models.CharField(max_length=32)
    make = models.CharField(max_length=100)
    model = models.CharField(max_length=100)
    year = models.PositiveIntegerField()
    office = models.ForeignKey(
        Office,
        on_delete=models.PROTECT,
        related_name="vehicles",
    )
    active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["license_plate"],
                condition=Q(active=True),
                name="fleet_unique_active_license_plate",
            ),
        ]
        indexes = [
            models.Index(fields=["office", "active"], name="fleet_vehicle_office_act_idx"),
            models.Index(fields=["make", "model"], name="fleet_vehicle_make_model_idx"),
        ]

    def canonicalize_identifiers(self):
        if self.vin is not None:
            self.vin = self.vin.strip().upper()
        if self.license_plate is not None:
            self.license_plate = self.license_plate.strip().upper()

    def clean(self):
        super().clean()
        self.canonicalize_identifiers()

    def save(self, *args, **kwargs):
        self.canonicalize_identifiers()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.vin


class Mechanic(models.Model):
    name = models.CharField(max_length=255)
    certification_number = models.CharField(max_length=64)
    active = models.BooleanField(default=True)

    class Meta:
        indexes = [
            models.Index(
                fields=["certification_number"],
                name="fleet_mechanic_cert_idx",
            ),
        ]

    def __str__(self):
        return self.name


class MaintenanceRecord(models.Model):
    vehicle = models.ForeignKey(
        Vehicle,
        on_delete=models.PROTECT,
        related_name="maintenance_records",
    )
    mechanic = models.ForeignKey(
        Mechanic,
        on_delete=models.PROTECT,
        related_name="maintenance_records",
    )
    maintenance_date = models.DateField()
    maintenance_type = models.CharField(max_length=100)
    cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    notes = models.TextField(blank=True, default="")

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=Q(cost__gte=0),
                name="fleet_maintenance_cost_nonnegative",
            ),
        ]
        indexes = [
            models.Index(
                fields=["vehicle", "-maintenance_date"],
                name="fleet_record_vehicle_date_idx",
            ),
            models.Index(
                fields=["mechanic", "maintenance_date"],
                name="fleet_record_mechanic_date_idx",
            ),
        ]

    def clean(self):
        super().clean()
        if self.maintenance_date and self.maintenance_date > date.today():
            raise ValidationError(
                {"maintenance_date": "Maintenance date cannot be in the future."}
            )

    def __str__(self):
        return f"{self.vehicle} - {self.maintenance_date}"
