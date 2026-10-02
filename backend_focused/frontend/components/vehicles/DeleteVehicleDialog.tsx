import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import type { Vehicle } from '@/lib/vehicles';

interface DeleteVehicleDialogProps {
  vehicle: Vehicle | null;
  isDeleting: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteVehicleDialog({
  vehicle,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: DeleteVehicleDialogProps) {
  return (
    <Dialog
      fullWidth
      maxWidth="xs"
      onClose={isDeleting ? undefined : onClose}
      open={Boolean(vehicle)}
    >
      <DialogTitle>Delete vehicle?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This will permanently delete {vehicle?.license_plate} (VIN {vehicle?.vin}).
        </DialogContentText>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button disabled={isDeleting} onClick={onClose}>
          Cancel
        </Button>
        <Button color="error" disabled={isDeleting} onClick={onConfirm} variant="contained">
          {isDeleting ? 'Deleting…' : 'Delete vehicle'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
