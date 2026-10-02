'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Paper, Skeleton, Snackbar, Stack, Typography } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { getApiErrorMessage, getApiStatus } from '@/lib/api-client';
import { deleteMechanic, fetchMechanicWorkload, type MechanicWorkload } from '@/lib/mechanics';
import DeleteMechanicDialog from './DeleteMechanicDialog';
import MechanicWorkloadTable from './MechanicWorkloadTable';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  style: 'currency',
});

function MetricCard({ label, value }: { label: string | number; value: string | number }) {
  return (
    <Paper sx={{ minWidth: 180, p: 2 }}>
      <Typography color="text.secondary" variant="body2">
        {label}
      </Typography>
      <Typography color="primary" variant="h4">
        {value}
      </Typography>
    </Paper>
  );
}

function WorkloadLoading() {
  return (
    <Stack spacing={3}>
      <Box display="flex" flexWrap="wrap" gap={2}>
        <Skeleton height={100} width={180} />
        <Skeleton height={100} width={180} />
        <Skeleton height={100} width={220} />
      </Box>
      <Paper sx={{ p: 2 }}>
        <Skeleton height={360} />
      </Paper>
    </Stack>
  );
}

export default function MechanicsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [mechanicToDelete, setMechanicToDelete] = useState<MechanicWorkload | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const notice = searchParams.get('notice');
  const workloadQuery = useQuery({
    queryKey: ['mechanic-workload'],
    queryFn: fetchMechanicWorkload,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteMechanic,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mechanics'] }),
        queryClient.invalidateQueries({ queryKey: ['mechanic-workload'] }),
      ]);
      setMechanicToDelete(null);
      setDeleteError(undefined);
    },
    onError: (error) => {
      setDeleteError(
        getApiStatus(error) === 409
          ? 'This mechanic cannot be deleted because maintenance records reference them.'
          : getApiErrorMessage(error),
      );
    },
  });

  function closeDeleteDialog() {
    if (!deleteMutation.isPending) {
      setMechanicToDelete(null);
      setDeleteError(undefined);
    }
  }

  function clearNotice() {
    router.replace('/mechanics', { scroll: false });
  }

  const mechanics = workloadQuery.data ?? [];
  const totalServices = mechanics.reduce(
    (total, mechanic) => total + mechanic.maintenance_count_current_year,
    0,
  );
  const totalMaintenanceValue = mechanics.reduce(
    (total, mechanic) => total + Number(mechanic.maintenance_cost_current_year),
    0,
  );

  return (
    <Stack spacing={3}>
      <Box display="flex" flexWrap="wrap" gap={2} justifyContent="space-between">
        <Box>
          <Typography component="h1" gutterBottom variant="h4">
            Mechanics
          </Typography>
          <Typography color="text.secondary">
            Current-year service workload and maintenance value by mechanic.
          </Typography>
        </Box>
        <Box>
          <Button onClick={() => router.push('/mechanics/new')} variant="contained">
            Add mechanic
          </Button>
        </Box>
      </Box>

      {workloadQuery.isPending ? (
        <WorkloadLoading />
      ) : workloadQuery.isError ? (
        <Alert
          action={
            <Button color="inherit" onClick={() => void workloadQuery.refetch()} size="small">
              Retry
            </Button>
          }
          severity="error"
        >
          {getApiErrorMessage(workloadQuery.error)}
        </Alert>
      ) : mechanics.length === 0 ? (
        <Alert severity="info">No mechanics found.</Alert>
      ) : (
        <Stack spacing={3}>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <MetricCard label="Mechanics shown" value={mechanics.length} />
            <MetricCard label="Services this year" value={totalServices} />
            <MetricCard
              label="Maintenance value this year"
              value={currencyFormatter.format(totalMaintenanceValue)}
            />
          </Box>
          <MechanicWorkloadTable
            mechanics={mechanics}
            onDelete={(mechanic) => {
              setMechanicToDelete(mechanic);
              setDeleteError(undefined);
            }}
            onEdit={(mechanic) => router.push(`/mechanics/${mechanic.id}/edit`)}
          />
        </Stack>
      )}

      <DeleteMechanicDialog
        error={deleteError}
        isDeleting={deleteMutation.isPending}
        mechanic={mechanicToDelete}
        onClose={closeDeleteDialog}
        onConfirm={() => mechanicToDelete && deleteMutation.mutate(mechanicToDelete.id)}
      />
      <Snackbar autoHideDuration={5_000} onClose={clearNotice} open={Boolean(notice)}>
        <Alert onClose={clearNotice} severity="success" variant="filled">
          {notice === 'created' ? 'Mechanic created.' : 'Mechanic updated.'}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
