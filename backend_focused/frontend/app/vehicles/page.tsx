import { Suspense } from 'react';
import { Paper, Skeleton, Stack } from '@mui/material';
import VehiclesPageContent from '@/components/vehicles/VehiclesPageContent';

function VehiclesPageFallback() {
  return (
    <Stack spacing={3}>
      <Skeleton height={56} width={180} />
      <Paper sx={{ p: 3 }}>
        <Skeleton height={36} width={220} />
        <Skeleton height={160} />
      </Paper>
      <Paper sx={{ p: 3 }}>
        <Skeleton height={280} />
      </Paper>
    </Stack>
  );
}

export default function VehiclesPage() {
  return (
    <Suspense fallback={<VehiclesPageFallback />}>
      <VehiclesPageContent />
    </Suspense>
  );
}
