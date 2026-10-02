'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Paper, Skeleton, Stack, Typography } from '@mui/material';
import Link from 'next/link';
import { getApiErrorMessage } from '@/lib/api-client';
import { fetchOfficeSummary } from '@/lib/offices';

interface OfficeDetailPageContentProps {
  officeId: number;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  style: 'currency',
});

function MetricCard({ label, value }: { label: string; value: string | number }) {
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

function formatDate(date: string | null) {
  return date ? dateFormatter.format(new Date(`${date}T00:00:00`)) : 'Never';
}

function BackToOffices() {
  return (
    <Button component={Link} href="/offices" variant="outlined">
      Back to offices
    </Button>
  );
}

export default function OfficeDetailPageContent({ officeId }: OfficeDetailPageContentProps) {
  const officeSummaryQuery = useQuery({
    queryKey: ['office-summary'],
    queryFn: fetchOfficeSummary,
    staleTime: 30_000,
  });

  if (officeSummaryQuery.isPending) {
    return (
      <Stack spacing={3}>
        <Skeleton height={86} />
        <Box display="flex" flexWrap="wrap" gap={2}>
          <Skeleton height={100} width={180} />
          <Skeleton height={100} width={220} />
          <Skeleton height={100} width={180} />
        </Box>
      </Stack>
    );
  }

  if (officeSummaryQuery.isError) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{getApiErrorMessage(officeSummaryQuery.error)}</Alert>
        <Stack direction="row" spacing={1}>
          <Button onClick={() => void officeSummaryQuery.refetch()} variant="outlined">
            Retry
          </Button>
          <BackToOffices />
        </Stack>
      </Stack>
    );
  }

  const office = officeSummaryQuery.data.find((summary) => summary.id === officeId);

  if (!office) {
    return (
      <Stack spacing={2}>
        <Alert severity="info">Office not found</Alert>
        <Box>
          <BackToOffices />
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      <Box display="flex" flexWrap="wrap" gap={2} justifyContent="space-between">
        <Box>
          <Typography component="h1" gutterBottom variant="h4">
            {office.name}
          </Typography>
          <Typography color="text.secondary">{office.city}</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <BackToOffices />
          <Button component={Link} href={`/vehicles?office=${office.id}`} variant="contained">
            View vehicles
          </Button>
        </Stack>
      </Box>

      <Box display="flex" flexWrap="wrap" gap={2}>
        <MetricCard label="Active vehicles" value={office.active_vehicle_count} />
        <MetricCard
          label="Maintenance cost - last 12 months"
          value={currencyFormatter.format(Number(office.maintenance_cost_last_year))}
        />
        <MetricCard label="Last maintenance" value={formatDate(office.last_maintenance)} />
      </Box>
    </Stack>
  );
}
