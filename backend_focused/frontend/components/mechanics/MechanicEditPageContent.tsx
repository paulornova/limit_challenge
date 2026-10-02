'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getApiErrorMessage, getApiStatus, getApiValidationErrors } from '@/lib/api-client';
import { fetchMechanic, updateMechanic, type MechanicPayload } from '@/lib/mechanics';
import MechanicForm, { type MechanicFormValues } from './MechanicForm';

interface MechanicEditPageContentProps {
  mechanicId: number;
}

const mechanicFields: Array<keyof MechanicFormValues> = ['name', 'certification_number', 'active'];

export default function MechanicEditPageContent({ mechanicId }: MechanicEditPageContentProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverErrors, setServerErrors] = useState<
    Partial<Record<keyof MechanicFormValues, string>>
  >({});
  const [generalError, setGeneralError] = useState<string>();
  const mechanicQuery = useQuery({
    queryKey: ['mechanic', mechanicId],
    queryFn: () => fetchMechanic(mechanicId),
  });
  const updateMutation = useMutation({
    mutationFn: (payload: MechanicPayload) => updateMechanic(mechanicId, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mechanics'] }),
        queryClient.invalidateQueries({ queryKey: ['mechanic-workload'] }),
        queryClient.invalidateQueries({ queryKey: ['mechanic', mechanicId] }),
      ]);
      router.push('/mechanics?notice=updated');
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
    updateMutation.mutate(payload);
  }

  if (mechanicQuery.isPending) {
    return (
      <Stack spacing={3}>
        <Skeleton height={56} width={220} />
        <Paper sx={{ p: 3 }}>
          <Skeleton height={260} />
        </Paper>
      </Stack>
    );
  }

  if (mechanicQuery.isError) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">
          {getApiStatus(mechanicQuery.error) === 404
            ? 'This mechanic no longer exists.'
            : getApiErrorMessage(mechanicQuery.error)}
        </Alert>
        <Box>
          <Button onClick={() => router.push('/mechanics')} variant="outlined">
            Back to mechanics
          </Button>
        </Box>
      </Stack>
    );
  }

  const mechanic = mechanicQuery.data;
  const initialValues: MechanicFormValues = {
    name: mechanic.name,
    certification_number: mechanic.certification_number,
    active: mechanic.active,
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography component="h1" gutterBottom variant="h4">
          Edit mechanic
        </Typography>
        <Typography color="text.secondary">Update mechanic details and availability.</Typography>
      </Box>
      <MechanicForm
        generalError={generalError}
        initialValues={initialValues}
        isSaving={updateMutation.isPending}
        onCancel={() => router.push('/mechanics')}
        onSubmit={handleSubmit}
        serverErrors={serverErrors}
        submitLabel="Save changes"
      />
    </Stack>
  );
}
