
from django.db.models.deletion import ProtectedError
from rest_framework import status, viewsets
from rest_framework.response import Response

from .models import MaintenanceRecord, Mechanic, Office, Vehicle
from .serializers import (
    MaintenanceRecordSerializer,
    MechanicSerializer,
    OfficeSerializer,
    VehicleSerializer,
)


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


class VehicleViewSet(ProtectedDeleteModelViewSet):
    queryset = Vehicle.objects.all()
    serializer_class = VehicleSerializer


class MechanicViewSet(ProtectedDeleteModelViewSet):
    queryset = Mechanic.objects.all()
    serializer_class = MechanicSerializer


class MaintenanceRecordViewSet(ProtectedDeleteModelViewSet):
    queryset = MaintenanceRecord.objects.all()
    serializer_class = MaintenanceRecordSerializer
