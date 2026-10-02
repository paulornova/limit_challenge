'use client';

import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { Office, VehiclePayload } from '@/lib/vehicles';

export interface VehicleFormValues {
  vin: string;
  license_plate: string;
  make: string;
  model: string;
  year: string;
  office: string;
  active: boolean;
}

export const emptyVehicleFormValues: VehicleFormValues = {
  vin: '',
  license_plate: '',
  make: '',
  model: '',
  year: '',
  office: '',
  active: true,
};

type FormField = keyof VehicleFormValues;
type FormErrors = Partial<Record<FormField, string>>;

interface VehicleFormProps {
  initialValues?: VehicleFormValues;
  offices?: Office[];
  officesError?: string;
  isLoadingOffices: boolean;
  isSaving: boolean;
  submitLabel: string;
  generalError?: string;
  serverErrors?: FormErrors;
  onCancel: () => void;
  onSubmit: (payload: VehiclePayload) => void;
}

const labels: Record<Exclude<FormField, 'active'>, string> = {
  vin: 'VIN',
  license_plate: 'License plate',
  make: 'Make',
  model: 'Model',
  year: 'Year',
  office: 'Office',
};

export default function VehicleForm({
  initialValues = emptyVehicleFormValues,
  offices = [],
  officesError,
  isLoadingOffices,
  isSaving,
  submitLabel,
  generalError,
  serverErrors,
  onCancel,
  onSubmit,
}: VehicleFormProps) {
  const [values, setValues] = useState(initialValues);
  const [clientErrors, setClientErrors] = useState<FormErrors>({});

  function updateTextField(event: ChangeEvent<HTMLInputElement>) {
    const field = event.target.name as Exclude<FormField, 'active'>;
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setClientErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateActive(event: ChangeEvent<HTMLInputElement>) {
    setValues((current) => ({ ...current, active: event.target.checked }));
  }

  function validate() {
    const errors: FormErrors = {};
    (['vin', 'license_plate', 'make', 'model'] as const).forEach((field) => {
      if (!values[field].trim()) {
        errors[field] = `${labels[field]} is required.`;
      }
    });
    if (!values.year.trim()) {
      errors.year = 'Year is required.';
    } else if (!Number.isInteger(Number(values.year))) {
      errors.year = 'Year must be a whole number.';
    }
    if (!values.office) {
      errors.office = 'Select an office.';
    }
    return errors;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate();
    setClientErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    onSubmit({
      vin: values.vin,
      license_plate: values.license_plate,
      make: values.make,
      model: values.model,
      year: Number(values.year),
      office: Number(values.office),
      active: values.active,
    });
  }

  function fieldError(field: FormField) {
    return clientErrors[field] ?? serverErrors?.[field];
  }

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ p: { xs: 2, md: 3 } }}>
      <Stack spacing={3}>
        {generalError && <Alert severity="error">{generalError}</Alert>}
        {officesError && <Alert severity="error">{officesError}</Alert>}

        <Box
          display="grid"
          gap={2}
          gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }}
        >
          {(['vin', 'license_plate', 'make', 'model'] as const).map((field) => (
            <TextField
              error={Boolean(fieldError(field))}
              fullWidth
              helperText={fieldError(field)}
              key={field}
              label={labels[field]}
              name={field}
              onChange={updateTextField}
              required
              value={values[field]}
            />
          ))}
          <TextField
            error={Boolean(fieldError('year'))}
            fullWidth
            helperText={fieldError('year')}
            inputProps={{ min: 0, step: 1 }}
            label={labels.year}
            name="year"
            onChange={updateTextField}
            required
            type="number"
            value={values.year}
          />
          {isLoadingOffices ? (
            <Box>
              <Typography color="text.secondary" variant="body2">
                Loading offices
              </Typography>
              <Skeleton height={56} />
            </Box>
          ) : (
            <TextField
              disabled={Boolean(officesError) || isSaving}
              error={Boolean(fieldError('office'))}
              fullWidth
              helperText={fieldError('office')}
              label={labels.office}
              name="office"
              onChange={updateTextField}
              required
              select
              value={values.office}
            >
              <MenuItem value="">Select an office</MenuItem>
              {offices.map((office) => (
                <MenuItem key={office.id} value={String(office.id)}>
                  {office.name} · {office.city}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Box>

        <FormControlLabel
          control={<Switch checked={values.active} onChange={updateActive} />}
          label="Vehicle is active"
        />

        <Stack direction={{ xs: 'column-reverse', sm: 'row' }} spacing={1.5}>
          <Button disabled={isSaving} onClick={onCancel} type="button" variant="text">
            Cancel
          </Button>
          <Button
            disabled={isSaving || isLoadingOffices || Boolean(officesError)}
            type="submit"
            variant="contained"
          >
            {isSaving ? 'Saving…' : submitLabel}
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
