'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Stack, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getApiErrorMessage, getApiValidationErrors } from '@/lib/api-client';
import { createVehicle, fetchOffices, type VehiclePayload } from '@/lib/vehicles';
import VehicleForm, { type VehicleFormValues } from './VehicleForm';

const vehicleFields: Array<keyof VehicleFormValues> = [
  'vin',
  'license_plate',
  'make',
  'model',
  'year',
  'office',
  'active',
];

export default function VehicleCreatePageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverErrors, setServerErrors] = useState<
    Partial<Record<keyof VehicleFormValues, string>>
  >({});
  const [generalError, setGeneralError] = useState<string>();
  const officesQuery = useQuery({ queryKey: ['offices'], queryFn: fetchOffices });
  const createMutation = useMutation({
    mutationFn: createVehicle,
    onSuccess: async (vehicle) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
        queryClient.invalidateQueries({ queryKey: ['maintenance-due'] }),
      ]);
      router.push(`/vehicles/${vehicle.id}`);
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
    createMutation.mutate(payload);
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography component="h1" gutterBottom variant="h4">
          Add vehicle
        </Typography>
        <Typography color="text.secondary">
          Add a vehicle to the fleet. The API validates VIN and active license plate conflicts.
        </Typography>
      </Box>
      <VehicleForm
        generalError={generalError}
        isLoadingOffices={officesQuery.isPending}
        isSaving={createMutation.isPending}
        offices={officesQuery.data}
        officesError={officesQuery.isError ? getApiErrorMessage(officesQuery.error) : undefined}
        onCancel={() => router.push('/vehicles')}
        onSubmit={handleSubmit}
        serverErrors={serverErrors}
        submitLabel="Create vehicle"
      />
    </Stack>
  );
}
