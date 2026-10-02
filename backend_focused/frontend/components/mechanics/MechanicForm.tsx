'use client';

import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { MechanicPayload } from '@/lib/mechanics';

export interface MechanicFormValues {
  name: string;
  certification_number: string;
  active: boolean;
}

export const emptyMechanicFormValues: MechanicFormValues = {
  name: '',
  certification_number: '',
  active: true,
};

type FormErrors = Partial<Record<keyof MechanicFormValues, string>>;

interface MechanicFormProps {
  initialValues?: MechanicFormValues;
  isSaving: boolean;
  submitLabel: string;
  generalError?: string;
  serverErrors?: FormErrors;
  onCancel: () => void;
  onSubmit: (payload: MechanicPayload) => void;
}

export default function MechanicForm({
  initialValues = emptyMechanicFormValues,
  isSaving,
  submitLabel,
  generalError,
  serverErrors,
  onCancel,
  onSubmit,
}: MechanicFormProps) {
  const [values, setValues] = useState(initialValues);
  const [clientErrors, setClientErrors] = useState<FormErrors>({});

  function updateTextField(event: ChangeEvent<HTMLInputElement>) {
    const field = event.target.name as 'name' | 'certification_number';
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setClientErrors((current) => ({ ...current, [field]: undefined }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: FormErrors = {};
    if (!values.name.trim()) {
      errors.name = 'Name is required.';
    }
    if (!values.certification_number.trim()) {
      errors.certification_number = 'Certification number is required.';
    }
    setClientErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    onSubmit({
      name: values.name,
      certification_number: values.certification_number,
      active: values.active,
    });
  }

  function fieldError(field: keyof MechanicFormValues) {
    return clientErrors[field] ?? serverErrors?.[field];
  }

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        {generalError && <Alert severity="error">{generalError}</Alert>}
        <Box display="grid" gap={2} gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)' }}>
          <TextField
            error={Boolean(fieldError('name'))}
            fullWidth
            helperText={fieldError('name')}
            label="Name"
            name="name"
            onChange={updateTextField}
            required
            value={values.name}
          />
          <TextField
            error={Boolean(fieldError('certification_number'))}
            fullWidth
            helperText={fieldError('certification_number')}
            label="Certification number"
            name="certification_number"
            onChange={updateTextField}
            required
            value={values.certification_number}
          />
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={values.active}
              onChange={(event) =>
                setValues((current) => ({ ...current, active: event.target.checked }))
              }
            />
          }
          label="Mechanic is active"
        />
        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5}>
          <Button disabled={isSaving} onClick={onCancel} type="button" variant="text">
            Cancel
          </Button>
          <Button disabled={isSaving} type="submit" variant="contained">
            {isSaving ? 'Saving...' : submitLabel}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
