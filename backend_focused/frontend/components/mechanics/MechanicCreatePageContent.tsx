'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Box, Stack, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getApiValidationErrors } from '@/lib/api-client';
import { createMechanic, type MechanicPayload } from '@/lib/mechanics';
import MechanicForm, { type MechanicFormValues } from './MechanicForm';

const mechanicFields: Array<keyof MechanicFormValues> = ['name', 'certification_number', 'active'];

export default function MechanicCreatePageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverErrors, setServerErrors] = useState<
    Partial<Record<keyof MechanicFormValues, string>>
  >({});
  const [generalError, setGeneralError] = useState<string>();
  const createMutation = useMutation({
    mutationFn: createMechanic,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mechanics'] }),
        queryClient.invalidateQueries({ queryKey: ['mechanic-workload'] }),
      ]);
      router.push('/mechanics?notice=created');
    },
    onError: (error) => {
      const result = getApiValidationErrors(error, mechanicFields);
      setServerErrors(result.fieldErrors);
      setGeneralError(result.generalError);
    },
  });

  function handleSubmit(payload: MechanicPayload) {
    setServerErrors({});
    setGeneralError(undefined);
    createMutation.mutate(payload);
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography component="h1" gutterBottom variant="h4">
          Add mechanic
        </Typography>
        <Typography color="text.secondary">
          Add a mechanic and their current availability to the fleet.
        </Typography>
      </Box>
      <MechanicForm
        generalError={generalError}
        isSaving={createMutation.isPending}
        onCancel={() => router.push('/mechanics')}
        onSubmit={handleSubmit}
        serverErrors={serverErrors}
        submitLabel="Create mechanic"
      />
    </Stack>
  );
}
