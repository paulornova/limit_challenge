'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { getApiErrorMessage } from '@/lib/api-client';
import { fetchMaintenanceDueVehicles } from '@/lib/vehicles';
import MaintenanceDueTable from './MaintenanceDueTable';

function MetricCard({ label, value }: { label: string; value: number }) {
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

function MaintenanceDueLoading() {
  return (
    <Stack spacing={3}>
      <Skeleton height={64} width={320} />
      <Box display="flex" flexWrap="wrap" gap={2}>
        <Skeleton height={100} width={180} />
        <Skeleton height={100} width={180} />
        <Skeleton height={100} width={180} />
      </Box>
      <Paper sx={{ p: 2 }}>
        <Skeleton height={420} />
      </Paper>
    </Stack>
  );
}

export default function MaintenanceDuePageContent() {
  const router = useRouter();
  const maintenanceDueQuery = useQuery({
    queryKey: ['maintenance-due'],
    queryFn: fetchMaintenanceDueVehicles,
  });

  if (maintenanceDueQuery.isPending) {
    return <MaintenanceDueLoading />;
  }

  if (maintenanceDueQuery.isError) {
    return (
      <Stack spacing={2}>
        <Alert
          action={
            <Button color="inherit" onClick={() => void maintenanceDueQuery.refetch()} size="small">
              Retry
            </Button>
          }
          severity="error"
        >
          {getApiErrorMessage(maintenanceDueQuery.error)}
        </Alert>
        <Box>
          <Button onClick={() => router.push('/vehicles')} variant="outlined">
            Back to vehicles
          </Button>
        </Box>
      </Stack>
    );
  }

  const vehicles = maintenanceDueQuery.data;
  const neverMaintained = vehicles.filter((vehicle) => vehicle.last_maintenance === null).length;
  const overdue = vehicles.length - neverMaintained;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography component="h1" gutterBottom variant="h4">
          Maintenance Due
        </Typography>
        <Typography color="text.secondary">
          Active vehicles that have never been serviced or are overdue for maintenance.
        </Typography>
      </Box>

      <Box display="flex" flexWrap="wrap" gap={2}>
        <MetricCard label="Vehicles needing maintenance" value={vehicles.length} />
        <MetricCard label="Never maintained" value={neverMaintained} />
        <MetricCard label="Overdue" value={overdue} />
      </Box>

      {vehicles.length === 0 ? (
        <Alert
          action={
            <Button color="inherit" onClick={() => router.push('/vehicles')} size="small">
              View vehicles
            </Button>
          }
          severity="success"
        >
          All active vehicles are up to date.
        </Alert>
      ) : (
        <MaintenanceDueTable
          onViewVehicle={(vehicle) => router.push(`/vehicles/${vehicle.id}`)}
          vehicles={vehicles}
        />
      )}
    </Stack>
  );
}
