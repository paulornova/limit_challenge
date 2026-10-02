'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { getApiErrorMessage, getApiStatus } from '@/lib/api-client';
import { fetchOffices, reassignVehicle, type Office } from '@/lib/vehicles';

interface ReassignOfficeDialogProps {
  currentOffice: Office;
  onClose: () => void;
  onSuccess: () => void;
  open: boolean;
  vehicleId: number;
}

export default function ReassignOfficeDialog({
  currentOffice,
  onClose,
  onSuccess,
  open,
  vehicleId,
}: ReassignOfficeDialogProps) {
  const queryClient = useQueryClient();
  const [officeId, setOfficeId] = useState(String(currentOffice.id));
  const officesQuery = useQuery({
    queryKey: ['offices'],
    queryFn: fetchOffices,
    enabled: open,
  });
  const reassignMutation = useMutation({
    mutationFn: (nextOfficeId: number) => reassignVehicle(vehicleId, nextOfficeId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['vehicle', vehicleId] }),
        queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
        queryClient.invalidateQueries({ queryKey: ['office-summary'] }),
      ]);
      onSuccess();
    },
  });

  const selectedCurrentOffice = Number(officeId) === currentOffice.id;
  const error = reassignMutation.isError
    ? getApiStatus(reassignMutation.error) === 404
      ? 'This vehicle no longer exists.'
      : getApiErrorMessage(reassignMutation.error)
    : undefined;

  function close() {
    if (!reassignMutation.isPending) {
      onClose();
    }
  }

  return (
    <Dialog fullWidth maxWidth="sm" onClose={close} open={open}>
      <DialogTitle>Reassign office</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography color="text.secondary">
            Current office: {currentOffice.name} - {currentOffice.city}
          </Typography>
          {officesQuery.isPending ? (
            <Skeleton height={56} />
          ) : officesQuery.isError ? (
            <Alert
              action={
                <Button color="inherit" onClick={() => void officesQuery.refetch()} size="small">
                  Retry
                </Button>
              }
              severity="error"
            >
              {getApiErrorMessage(officesQuery.error)}
            </Alert>
          ) : (
            <TextField
              fullWidth
              label="New office"
              onChange={(event) => setOfficeId(event.target.value)}
              select
              value={officeId}
            >
              {officesQuery.data?.map((office) => (
                <MenuItem key={office.id} value={String(office.id)}>
                  {office.name} - {office.city}
                </MenuItem>
              ))}
            </TextField>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={reassignMutation.isPending} onClick={close}>
          Cancel
        </Button>
        <Button
          disabled={
            officesQuery.isPending ||
            officesQuery.isError ||
            selectedCurrentOffice ||
            reassignMutation.isPending
          }
          onClick={() => reassignMutation.mutate(Number(officeId))}
          variant="contained"
        >
          {reassignMutation.isPending ? 'Reassigning...' : 'Reassign office'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
