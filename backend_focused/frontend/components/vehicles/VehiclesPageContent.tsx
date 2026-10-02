'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  fetchVehicles,
  hasVehicleFilters,
  parseVehicleSearchParams,
  vehicleSearchUrl,
} from '@/lib/vehicles';
import VehicleFilters from './VehicleFilters';
import VehicleTable from './VehicleTable';

export default function VehiclesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchString = searchParams.toString();
  const appliedSearch = useMemo(
    () => parseVehicleSearchParams(new URLSearchParams(searchString)),
    [searchString],
  );
  const { page, ...appliedFilters } = appliedSearch;
  const hasActiveFilters = hasVehicleFilters(appliedFilters);

  const vehiclesQuery = useQuery({
    queryKey: ['vehicles', appliedSearch],
    queryFn: () => fetchVehicles(appliedSearch),
    placeholderData: keepPreviousData,
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

  const data = vehiclesQuery.data;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography component="h1" gutterBottom variant="h4">
          Vehicles
        </Typography>
        <Typography color="text.secondary">
          Search the fleet by office, status, vehicle attributes, or maintenance activity.
        </Typography>
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
    </Stack>
  );
}
