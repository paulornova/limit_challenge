import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import type { MechanicWorkload } from '@/lib/mechanics';

interface DeleteMechanicDialogProps {
  mechanic: MechanicWorkload | null;
  isDeleting: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteMechanicDialog({
  mechanic,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: DeleteMechanicDialogProps) {
  return (
    <Dialog
      fullWidth
      maxWidth="xs"
      onClose={isDeleting ? undefined : onClose}
      open={Boolean(mechanic)}
    >
      <DialogTitle>Delete mechanic?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This will permanently delete {mechanic?.name} ({mechanic?.certification_number}).
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
          {isDeleting ? 'Deleting...' : 'Delete mechanic'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
