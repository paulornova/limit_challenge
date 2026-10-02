'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Skeleton,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getApiErrorMessage, getApiStatus } from '@/lib/api-client';
import { fetchVehicle } from '@/lib/vehicles';
import MaintenanceHistoryTable from './MaintenanceHistoryTable';
import ReassignOfficeDialog from './ReassignOfficeDialog';

interface VehicleDetailPageContentProps {
  vehicleId: number;
}

const vehicleFields = [
  ['VIN', 'vin'],
  ['License plate', 'license_plate'],
  ['Make', 'make'],
  ['Model', 'model'],
  ['Year', 'year'],
] as const;

export default function VehicleDetailPageContent({ vehicleId }: VehicleDetailPageContentProps) {
  const router = useRouter();
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignSucceeded, setReassignSucceeded] = useState(false);
  const vehicleQuery = useQuery({
    queryKey: ['vehicle', vehicleId],
    queryFn: () => fetchVehicle(vehicleId),
  });

  if (vehicleQuery.isPending) {
    return (
      <Stack spacing={3}>
        <Skeleton height={86} />
        <Skeleton height={180} />
        <Skeleton height={320} />
      </Stack>
    );
  }

  if (vehicleQuery.isError) {
    const notFound = getApiStatus(vehicleQuery.error) === 404;
    return (
      <Stack spacing={2}>
        <Alert severity="error">
          {notFound ? 'Vehicle not found.' : getApiErrorMessage(vehicleQuery.error)}
        </Alert>
        <Stack direction="row" spacing={1}>
          {!notFound && (
            <Button onClick={() => void vehicleQuery.refetch()} variant="outlined">
              Retry
            </Button>
          )}
          <Button onClick={() => router.push('/vehicles')} variant="outlined">
            Back to vehicles
          </Button>
        </Stack>
      </Stack>
    );
  }

  const vehicle = vehicleQuery.data;

  return (
    <Stack spacing={3}>
      <Box display="flex" flexWrap="wrap" gap={2} justifyContent="space-between">
        <Box>
          <Stack alignItems="center" direction="row" spacing={1.5}>
            <Typography component="h1" variant="h4">
              {vehicle.make} {vehicle.model}
            </Typography>
            <Chip
              color={vehicle.active ? 'success' : 'default'}
              label={vehicle.active ? 'Active' : 'Inactive'}
              size="small"
              variant={vehicle.active ? 'filled' : 'outlined'}
            />
          </Stack>
          <Typography color="text.secondary">
            {vehicle.license_plate} · VIN {vehicle.vin}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button onClick={() => router.push('/vehicles')} variant="outlined">
            Back to vehicles
          </Button>
          <Button onClick={() => setReassignOpen(true)} variant="outlined">
            Reassign office
          </Button>
          <Button onClick={() => router.push(`/vehicles/${vehicle.id}/edit`)} variant="contained">
            Edit
          </Button>
        </Stack>
      </Box>

      <Paper sx={{ p: { xs: 2, md: 3 } }}>
        <Typography component="h2" gutterBottom variant="h6">
          Vehicle information
        </Typography>
        <Box
          display="grid"
          gap={2}
          gridTemplateColumns={{
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(3, minmax(0, 1fr))',
          }}
        >
          {vehicleFields.map(([label, field]) => (
            <Box key={field}>
              <Typography color="text.secondary" variant="body2">
                {label}
              </Typography>
              <Typography>{vehicle[field]}</Typography>
            </Box>
          ))}
          <Box>
            <Typography color="text.secondary" variant="body2">
              Office
            </Typography>
            <Typography>{vehicle.office.name}</Typography>
            <Typography color="text.secondary" variant="body2">
              {vehicle.office.city}
            </Typography>
          </Box>
          <Box>
            <Typography color="text.secondary" variant="body2">
              Status
            </Typography>
            <Typography>{vehicle.active ? 'Active' : 'Inactive'}</Typography>
          </Box>
        </Box>
      </Paper>

      <Box>
        <Typography component="h2" gutterBottom variant="h6">
          Maintenance history
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
          {vehicle.maintenance_records.length} records, ordered by the API from newest to oldest.
        </Typography>
        <MaintenanceHistoryTable records={vehicle.maintenance_records} />
      </Box>

      {reassignOpen && (
        <ReassignOfficeDialog
          currentOffice={vehicle.office}
          onClose={() => setReassignOpen(false)}
          onSuccess={() => {
            setReassignOpen(false);
            setReassignSucceeded(true);
          }}
          open={reassignOpen}
          vehicleId={vehicle.id}
        />
      )}
      <Snackbar
        autoHideDuration={5_000}
        onClose={() => setReassignSucceeded(false)}
        open={reassignSucceeded}
      >
        <Alert onClose={() => setReassignSucceeded(false)} severity="success" variant="filled">
          Vehicle reassigned.
        </Alert>
      </Snackbar>
    </Stack>
  );
}
