
from datetime import date, timedelta
from decimal import Decimal

from django.db import models
from django.db.models import Count, Exists, F, Max, OuterRef, Q, Sum, Value
from django.db.models.deletion import ProtectedError
from django.db.models.functions import Coalesce
from django.db.models.query import Prefetch
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import MaintenanceRecord, Mechanic, Office, Vehicle
from .serializers import (
    MaintenanceRecordSerializer,
    MaintenanceHistorySerializer,
    MechanicSerializer,
    MechanicWorkloadSerializer,
    OfficeSerializer,
    OfficeSummarySerializer,
    VehicleSerializer,
    VehicleDetailSerializer,
    VehicleNeedingMaintenanceSerializer,
)


def calendar_year_ago(today):
    try:
        return today.replace(year=today.year - 1)
    except ValueError:
        return today.replace(year=today.year - 1, month=2, day=28)


def parse_optional_date(query_params, key):
    value = query_params.get(key)
    if value is None:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise serializers.ValidationError(
            {key: "Enter a valid ISO-8601 date."}
        ) from error


def parse_optional_boolean(query_params, key):
    value = query_params.get(key)
    if value is None:
        return None
    normalized = value.lower()
    if normalized in {"true", "1"}:
        return True
    if normalized in {"false", "0"}:
        return False
    raise serializers.ValidationError({key: "Enter a valid boolean."})


class ProtectedDeleteModelViewSet(viewsets.ModelViewSet):
    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "This resource cannot be deleted while related records exist."},
                status=status.HTTP_409_CONFLICT,
            )


class OfficeViewSet(ProtectedDeleteModelViewSet):
    queryset = Office.objects.all()
    serializer_class = OfficeSerializer

    @action(detail=False, methods=["get"])
    def summary(self, request):
        last_year_start = calendar_year_ago(date.today())
        queryset = Office.objects.annotate(
            active_vehicle_count=Count(
                "vehicles", filter=Q(vehicles__active=True), distinct=True
            ),
            maintenance_cost_last_year=Coalesce(
                Sum(
                    "vehicles__maintenance_records__cost",
                    filter=Q(
                        vehicles__maintenance_records__maintenance_date__gte=last_year_start
                    ),
                ),
                Value(Decimal("0.00")),
                output_field=models.DecimalField(max_digits=12, decimal_places=2),
            ),
            last_maintenance=Max("vehicles__maintenance_records__maintenance_date"),
        )
        return Response(OfficeSummarySerializer(queryset, many=True).data)


class VehicleViewSet(ProtectedDeleteModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer

    def get_queryset(self):
        if self.action == "retrieve":
            maintenance_queryset = MaintenanceRecord.objects.select_related("mechanic").order_by(
                "-maintenance_date", "-id"
            )
            return Vehicle.objects.select_related("office").prefetch_related(
                Prefetch("maintenance_records", queryset=maintenance_queryset)
            )
        if self.action == "list":
            return self._search_queryset()
        return Vehicle.objects.all()

    def get_serializer_class(self):
        if self.action == "retrieve":
            return VehicleDetailSerializer
        if self.action == "needing_maintenance":
            return VehicleNeedingMaintenanceSerializer
        if self.action == "maintenance_history":
            return MaintenanceHistorySerializer
        return VehicleSerializer

    def _search_queryset(self):
        query_params = self.request.query_params
        maintenance_date_from = parse_optional_date(
            query_params, "maintenance_date_from"
        )
        maintenance_date_to = parse_optional_date(query_params, "maintenance_date_to")
        if (
            maintenance_date_from
            and maintenance_date_to
            and maintenance_date_from > maintenance_date_to
        ):
            raise serializers.ValidationError(
                {
                    "maintenance_date_to": (
                        "Must be on or after maintenance_date_from."
                    )
                }
            )

        queryset = Vehicle.objects.select_related("office").order_by("id")
        office = query_params.get("office")
        if office is not None:
            try:
                queryset = queryset.filter(office_id=int(office))
            except ValueError as error:
                raise serializers.ValidationError(
                    {"office": "Enter a valid office ID."}
                ) from error

        active = parse_optional_boolean(query_params, "active")
        if active is not None:
            queryset = queryset.filter(active=active)
        for field in ("make", "model"):
            value = query_params.get(field)
            if value is not None:
                queryset = queryset.filter(**{field: value})

        certification_number = query_params.get("mechanic_certification_number")
        if any(
            [maintenance_date_from, maintenance_date_to, certification_number is not None]
        ):
            maintenance_filters = {"vehicle_id": OuterRef("pk")}
            if maintenance_date_from:
                maintenance_filters["maintenance_date__gte"] = maintenance_date_from
            if maintenance_date_to:
                maintenance_filters["maintenance_date__lte"] = maintenance_date_to
            if certification_number is not None:
                maintenance_filters[
                    "mechanic__certification_number"
                ] = certification_number
            queryset = queryset.filter(
                Exists(MaintenanceRecord.objects.filter(**maintenance_filters))
            )
        return queryset

    @action(detail=True, methods=["get"], url_path="maintenance-history")
    def maintenance_history(self, request, *args, **kwargs):
        vehicle = self.get_object()
        queryset = MaintenanceRecord.objects.filter(vehicle=vehicle).select_related(
            "mechanic"
        ).order_by("-maintenance_date", "-id")
        return Response(MaintenanceHistorySerializer(queryset, many=True).data)

    @action(detail=False, methods=["get"], url_path="needing-maintenance")
    def needing_maintenance(self, request):
        cutoff = date.today() - timedelta(days=365)
        queryset = Vehicle.objects.filter(active=True).annotate(
            last_maintenance=Max("maintenance_records__maintenance_date")
        ).filter(
            Q(last_maintenance__isnull=True) | Q(last_maintenance__lt=cutoff)
        ).order_by(F("last_maintenance").asc(nulls_first=True), "id")
        return Response(self.get_serializer(queryset, many=True).data)


class MechanicViewSet(ProtectedDeleteModelViewSet):
    queryset = Mechanic.objects.all()
    serializer_class = MechanicSerializer

    @action(detail=False, methods=["get"])
    def workload(self, request):
        current_year_start = date.today().replace(month=1, day=1)
        queryset = Mechanic.objects.annotate(
            maintenance_count_current_year=Count(
                "maintenance_records",
                filter=Q(
                    maintenance_records__maintenance_date__gte=current_year_start
                ),
            ),
            maintenance_cost_current_year=Coalesce(
                Sum(
                    "maintenance_records__cost",
                    filter=Q(
                        maintenance_records__maintenance_date__gte=current_year_start
                    ),
                ),
                Value(Decimal("0.00")),
                output_field=models.DecimalField(max_digits=12, decimal_places=2),
            ),
        ).order_by(
            "-maintenance_count_current_year", "-maintenance_cost_current_year", "id"
        )
        return Response(MechanicWorkloadSerializer(queryset, many=True).data)


class MaintenanceRecordViewSet(ProtectedDeleteModelViewSet):
    queryset = MaintenanceRecord.objects.all()
    serializer_class = MaintenanceRecordSerializer
