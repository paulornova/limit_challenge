'use client';

import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { emptyVehicleFilters, type VehicleFilterValues } from '@/lib/vehicles';

interface VehicleFiltersProps {
  initialValues: VehicleFilterValues;
  onApply: (values: VehicleFilterValues) => void;
  onClear: () => void;
}

const fieldLabels: Record<keyof VehicleFilterValues, string> = {
  office: 'Office ID',
  active: 'Status',
  make: 'Make',
  model: 'Model',
  maintenance_date_from: 'Maintenance from',
  maintenance_date_to: 'Maintenance to',
  mechanic_certification_number: 'Mechanic certification',
};

export default function VehicleFilters({ initialValues, onApply, onClear }: VehicleFiltersProps) {
  const [values, setValues] = useState(initialValues);
  const [dateRangeError, setDateRangeError] = useState<string>();

  function updateField(event: ChangeEvent<HTMLInputElement>) {
    const key = event.target.name as keyof VehicleFilterValues;
    setValues((currentValues) => ({ ...currentValues, [key]: event.target.value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      values.maintenance_date_from &&
      values.maintenance_date_to &&
      values.maintenance_date_from > values.maintenance_date_to
    ) {
      setDateRangeError('Maintenance end date must be on or after the start date.');
      return;
    }

    setDateRangeError(undefined);
    onApply(values);
  }

  function handleClear() {
    setValues({ ...emptyVehicleFilters });
    setDateRangeError(undefined);
    onClear();
  }

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={{ mb: 3, p: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5}>
        <Box>
          <Typography component="h2" variant="h6">
            Search vehicles
          </Typography>
          <Typography color="text.secondary" variant="body2">
            Set one or more criteria, then apply them to the vehicle list.
          </Typography>
        </Box>

        {dateRangeError && <Alert severity="warning">{dateRangeError}</Alert>}

        <Box
          display="grid"
          gap={2}
          gridTemplateColumns={{
            xs: '1fr',
            sm: 'repeat(2, minmax(0, 1fr))',
            lg: 'repeat(4, minmax(0, 1fr))',
          }}
        >
          <TextField
            fullWidth
            inputProps={{ min: 1 }}
            label={fieldLabels.office}
            name="office"
            onChange={updateField}
            type="number"
            value={values.office}
          />
          <TextField
            fullWidth
            label={fieldLabels.active}
            name="active"
            onChange={updateField}
            select
            value={values.active}
          >
            <MenuItem value="">All statuses</MenuItem>
            <MenuItem value="true">Active</MenuItem>
            <MenuItem value="false">Inactive</MenuItem>
          </TextField>
          <TextField
            fullWidth
            label={fieldLabels.make}
            name="make"
            onChange={updateField}
            value={values.make}
          />
          <TextField
            fullWidth
            label={fieldLabels.model}
            name="model"
            onChange={updateField}
            value={values.model}
          />
          <TextField
            fullWidth
            label={fieldLabels.maintenance_date_from}
            name="maintenance_date_from"
            onChange={updateField}
            slotProps={{ inputLabel: { shrink: true } }}
            type="date"
            value={values.maintenance_date_from}
          />
          <TextField
            fullWidth
            label={fieldLabels.maintenance_date_to}
            name="maintenance_date_to"
            onChange={updateField}
            slotProps={{ inputLabel: { shrink: true } }}
            type="date"
            value={values.maintenance_date_to}
          />
          <TextField
            fullWidth
            label={fieldLabels.mechanic_certification_number}
            name="mechanic_certification_number"
            onChange={updateField}
            value={values.mechanic_certification_number}
          />
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
          <Button type="submit" variant="contained">
            Apply filters
          </Button>
          <Button onClick={handleClear} type="button" variant="text">
            Clear filters
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}
