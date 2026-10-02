'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getApiErrorMessage, getApiStatus, getApiValidationErrors } from '@/lib/api-client';
import { fetchOffices, fetchVehicle, updateVehicle, type VehiclePayload } from '@/lib/vehicles';
import VehicleForm, { type VehicleFormValues } from './VehicleForm';

interface VehicleEditPageContentProps {
  vehicleId: number;
}

const vehicleFields: Array<keyof VehicleFormValues> = [
  'vin',
  'license_plate',
  'make',
  'model',
  'year',
  'office',
  'active',
];

export default function VehicleEditPageContent({ vehicleId }: VehicleEditPageContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverErrors, setServerErrors] = useState<
    Partial<Record<keyof VehicleFormValues, string>>
  >({});
  const [generalError, setGeneralError] = useState<string>();
  const vehicleQuery = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => fetchVehicle(vehicleId),
  });
  const officesQuery = useQuery({ queryKey: ['offices'], queryFn: fetchOffices });
  const updateMutation = useMutation({
    mutationFn: (payload: VehiclePayload) => updateVehicle(vehicleId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
        queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] }),
        queryClient.invalidateQueries({ queryKey: ['maintenance-due'] }),
      ]);
      router.push('/vehicles?notice=updated');
    },
    onError: (error) => {
      const result = getApiValidationErrors(error, vehicleFields);
      setServerErrors(result.fieldErrors);
      setGeneralError(result.generalError);
    },
  });

  function handleSubmit(payload: VehiclePayload) {
    setServerErrors({});
    setGeneralError(undefined);
    updateMutation.mutate(payload);
  }

  if (vehicleQuery.isPending) {
    return (
      <Stack spacing={3}>
        <Skeleton height={56} width={220} />
        <Paper sx={{ p: 3 }}>
          <Skeleton height={340} />
        </Paper>
      </Stack>
    );
  }

  if (vehicleQuery.isError) {
    const notFound = getApiStatus(vehicleQuery.error) === 404;
    return (
      <Stack spacing={2}>
        <Alert severity="error">
          {notFound ? 'This vehicle no longer exists.' : getApiErrorMessage(vehicleQuery.error)}
        </Alert>
        <Box>
          <Button onClick={() => router.push('/vehicles')} variant="outlined">
            Back to vehicles
          </Button>
        </Box>
      </Stack>
    );
  }

  const vehicle = vehicleQuery.data;
  const initialValues: VehicleFormValues = {
    vin: vehicle.vin,
    license_plate: vehicle.license_plate,
    make: vehicle.make,
    model: vehicle.model,
    year: String(vehicle.year),
    office: String(vehicle.office.id),
    active: vehicle.active,
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography component="h1" gutterBottom variant="h4">
          Edit vehicle
        </Typography>
        <Typography color="text.secondary">
          Update {vehicle.license_plate} without changing the fleet search experience.
        </Typography>
      </Box>
      <VehicleForm
        generalError={generalError}
        initialValues={initialValues}
        isLoadingOffices={officesQuery.isPending}
        isSaving={updateMutation.isPending}
        offices={officesQuery.data}
        officesError={officesQuery.isError ? getApiErrorMessage(officesQuery.error) : undefined}
        onCancel={() => router.push('/vehicles')}
        onSubmit={handleSubmit}
        serverErrors={serverErrors}
        submitLabel="Save changes"
      />
    </Stack>
  );
}
