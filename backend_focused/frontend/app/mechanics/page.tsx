import { Suspense } from 'react';
import { Paper, Skeleton, Stack } from '@mui/material';
import MechanicsPageContent from '@/components/mechanics/MechanicsPageContent';

function MechanicsPageFallback() {
  return (
    <Stack spacing={3}>
      <Skeleton height={56} width={180} />
      <Paper sx={{ p: 3 }}>
        <Skeleton height={360} />
      </Paper>
    </Stack>
  );
}

export default function MechanicsPage() {
  return (
    <Suspense fallback={<MechanicsPageFallback />}>
      <MechanicsPageContent />
    </Suspense>
  );
}
