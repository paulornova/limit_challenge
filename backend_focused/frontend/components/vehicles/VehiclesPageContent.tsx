'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Snackbar, Stack, Typography } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { getApiErrorMessage, getApiStatus } from '@/lib/api-client';
import {
  deleteVehicle,
  fetchVehicles,
  hasVehicleFilters,
  parseVehicleSearchParams,
  vehicleSearchUrl,
  type Vehicle,
} from '@/lib/vehicles';
import DeleteVehicleDialog from './DeleteVehicleDialog';
import VehicleFilters from './VehicleFilters';
import VehicleTable from './VehicleTable';

export default function VehiclesPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const appliedSearch = useMemo(
    () => parseVehicleSearchParams(new URLSearchParams(searchString)),
    [searchString],
  );
  const { page, ...appliedFilters } = appliedSearch;
  const hasActiveFilters = hasVehicleFilters(appliedFilters);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleteSucceeded, setDeleteSucceeded] = useState(false);
  const notice = searchParams.get('notice');

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', appliedSearch],
    queryFn: () => fetchVehicles(appliedSearch),
    placeholderData: keepPreviousData,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteVehicle,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
        queryClient.invalidateQueries({ queryKey: ['maintenance-due'] }),
      ]);
      setVehicleToDelete(null);
      setDeleteError(undefined);
      setDeleteSucceeded(true);
    },
    onError: (error) => {
      setDeleteError(
        getApiStatus(error) === 409
          ? 'This vehicle cannot be deleted because maintenance history exists.'
          : getApiErrorMessage(error),
      );
    },
  });

  function applyFilters(filters: typeof appliedFilters) {
    router.push(vehicleSearchUrl(filters), { scroll: false });
  }

  function clearFilters() {
    router.push('/vehicles', { scroll: false });
  }

  function changePage(nextPage: number) {
    router.push(vehicleSearchUrl(appliedFilters, nextPage), { scroll: false });
  }

  function openDeleteDialog(vehicle: Vehicle) {
    setVehicleToDelete(vehicle);
    setDeleteError(undefined);
  }

  function closeDeleteDialog() {
    if (!deleteMutation.isPending) {
      setVehicleToDelete(null);
      setDeleteError(undefined);
    }
  }

  function confirmDelete() {
    if (vehicleToDelete) {
      deleteMutation.mutate(vehicleToDelete.id);
    }
  }

  function clearNotice() {
    router.replace(vehicleSearchUrl(appliedFilters, page), { scroll: false });
  }

  const data = vehiclesQuery.data;

  return (
    <Stack spacing={3}>
      <Box display="flex" flexWrap="wrap" gap={2} justifyContent="space-between">
        <Box>
          <Typography component="h1" gutterBottom variant="h4">
            Vehicles
          </Typography>
          <Typography color="text.secondary">
            Search the fleet by office, status, vehicle attributes, or maintenance activity.
          </Typography>
        </Box>
        <Box>
          <Button onClick={() => router.push('/vehicles/new')} variant="contained">
            Add vehicle
          </Button>
        </Box>
      </Box>

      <VehicleFilters
        initialValues={appliedFilters}
        key={searchString}
        onApply={applyFilters}
        onClear={clearFilters}
      />

      {vehiclesQuery.isError ? (
        <Alert
          action={
            <Button color="inherit" onClick={() => void vehiclesQuery.refetch()} size="small">
              Retry
            </Button>
          }
          severity="error"
        >
          {getApiErrorMessage(vehiclesQuery.error)}
        </Alert>
      ) : data && data.results.length === 0 ? (
        <Alert
          action={
            hasActiveFilters ? (
              <Button color="inherit" onClick={clearFilters} size="small">
                Clear filters
              </Button>
            ) : undefined
          }
          severity="info"
        >
          No vehicles match the selected filters.
        </Alert>
      ) : (
        <VehicleTable
          isInitialLoading={vehiclesQuery.isPending}
          isRefreshing={vehiclesQuery.isFetching && !vehiclesQuery.isPending}
          onDelete={openDeleteDialog}
          onDetails={(vehicle) => router.push(`/vehicles/${vehicle.id}`)}
          onEdit={(vehicle) => router.push(`/vehicles/${vehicle.id}/edit`)}
          vehicles={data?.results ?? []}
        />
      )}

      {data && data.results.length > 0 && (
        <Stack
          alignItems={{ xs: 'stretch', sm: 'center' }}
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Typography color="text.secondary" variant="body2">
            {data.count} vehicles found · Page {page}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              disabled={!data.previous}
              onClick={() => changePage(page - 1)}
              variant="outlined"
            >
              Previous
            </Button>
            <Button disabled={!data.next} onClick={() => changePage(page + 1)} variant="contained">
              Next
            </Button>
          </Stack>
        </Stack>
      )}

      <DeleteVehicleDialog
        error={deleteError}
        isDeleting={deleteMutation.isPending}
        onClose={closeDeleteDialog}
        onConfirm={confirmDelete}
        vehicle={vehicleToDelete}
      />
      <Snackbar autoHideDuration={5_000} onClose={clearNotice} open={Boolean(notice)}>
        <Alert onClose={clearNotice} severity="success" variant="filled">
          {notice === 'created' ? 'Vehicle created.' : 'Vehicle updated.'}
        </Alert>
      </Snackbar>
      <Snackbar
        autoHideDuration={5_000}
        onClose={() => setDeleteSucceeded(false)}
        open={deleteSucceeded}
      >
        <Alert onClose={() => setDeleteSucceeded(false)} severity="success" variant="filled">
          Vehicle deleted.
        </Alert>
      </Snackbar>
    </Stack>
  );
}
