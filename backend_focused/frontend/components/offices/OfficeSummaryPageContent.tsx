'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import { getApiErrorMessage } from '@/lib/api-client';
import { fetchOfficeSummary, type OfficeSummary } from '@/lib/offices';

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

function OfficeSummaryTable({ offices }: { offices: OfficeSummary[] }) {
  return (
    <TableContainer component={Paper}>
      <Table aria-label="Office summary" sx={{ minWidth: 840 }}>
        <TableHead>
          <TableRow>
            <TableCell>Office</TableCell>
            <TableCell>City</TableCell>
            <TableCell align="right">Active vehicles</TableCell>
            <TableCell align="right">Maintenance cost - last 12 months</TableCell>
            <TableCell>Last maintenance</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {offices.map((office) => (
            <TableRow hover key={office.id}>
              <TableCell>
                <Link
                  href={`/offices/${office.id}`}
                  style={{
                    color: 'inherit',
                    fontWeight: 600,
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  {office.name}
                </Link>
              </TableCell>
              <TableCell>{office.city}</TableCell>
              <TableCell align="right">
                <Button
                  component={Link}
                  href={`/vehicles?office=${office.id}&active=true`}
                  size="small"
                >
                  {office.active_vehicle_count}
                </Button>
              </TableCell>
              <TableCell align="right">
                {currencyFormatter.format(Number(office.maintenance_cost_last_year))}
              </TableCell>
              <TableCell>{formatDate(office.last_maintenance)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function OfficeSummaryLoading() {
  return (
    <Stack spacing={3}>
      <Skeleton height={64} width={240} />
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

export default function OfficeSummaryPageContent() {
  const officeSummaryQuery = useQuery({
    queryKey: ['office-summary'],
    queryFn: fetchOfficeSummary,
    staleTime: 30_000,
  });

  if (officeSummaryQuery.isPending) {
    return <OfficeSummaryLoading />;
  }

  if (officeSummaryQuery.isError) {
    return (
      <Alert
        action={
          <Button color="inherit" onClick={() => void officeSummaryQuery.refetch()} size="small">
            Retry
          </Button>
        }
        severity="error"
      >
        {getApiErrorMessage(officeSummaryQuery.error)}
      </Alert>
    );
  }

  const offices = officeSummaryQuery.data;
  const totalActiveVehicles = offices.reduce(
    (total, office) => total + office.active_vehicle_count,
    0,
  );
  const totalMaintenanceCost = offices.reduce(
    (total, office) => total + Number(office.maintenance_cost_last_year),
    0,
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography component="h1" gutterBottom variant="h4">
          Offices
        </Typography>
        <Typography color="text.secondary">
          Fleet activity and maintenance cost by office for the last 12 months.
        </Typography>
      </Box>

      <Box display="flex" flexWrap="wrap" gap={2}>
        <MetricCard label="Offices" value={offices.length} />
        <MetricCard label="Active vehicles" value={totalActiveVehicles} />
        <MetricCard
          label="Maintenance cost - last 12 months"
          value={currencyFormatter.format(totalMaintenanceCost)}
        />
      </Box>

      {offices.length === 0 ? (
        <Alert severity="info">No offices are available yet.</Alert>
      ) : (
        <OfficeSummaryTable offices={offices} />
      )}
    </Stack>
  );
}
