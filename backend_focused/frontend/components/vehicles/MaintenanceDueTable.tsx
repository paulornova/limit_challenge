import {
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import type { MaintenanceDueVehicle } from '@/lib/vehicles';

interface MaintenanceDueTableProps {
  vehicles: MaintenanceDueVehicle[];
  onViewVehicle: (vehicle: MaintenanceDueVehicle) => void;
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatMaintenanceDate(date: string | null) {
  return date ? dateFormatter.format(new Date(`${date}T00:00:00`)) : 'Never';
}

export default function MaintenanceDueTable({ vehicles, onViewVehicle }: MaintenanceDueTableProps) {
  return (
    <TableContainer component={Paper} sx={{ maxHeight: 640 }}>
      <Table
        aria-label="Vehicles needing maintenance"
        size="small"
        stickyHeader
        sx={{ minWidth: 960 }}
      >
        <TableHead>
          <TableRow>
            <TableCell>Vehicle</TableCell>
            <TableCell>License plate</TableCell>
            <TableCell>VIN</TableCell>
            <TableCell>Office</TableCell>
            <TableCell>Last maintenance</TableCell>
            <TableCell>Maintenance status</TableCell>
            <TableCell align="right">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {vehicles.map((vehicle) => {
            const neverMaintained = vehicle.last_maintenance === null;

            return (
              <TableRow hover key={vehicle.id}>
                <TableCell>
                  {vehicle.make} {vehicle.model}
                </TableCell>
                <TableCell>{vehicle.license_plate}</TableCell>
                <TableCell>{vehicle.vin}</TableCell>
                <TableCell>Office #{vehicle.office}</TableCell>
                <TableCell>{formatMaintenanceDate(vehicle.last_maintenance)}</TableCell>
                <TableCell>
                  <Chip
                    color={neverMaintained ? 'warning' : 'error'}
                    label={neverMaintained ? 'Never maintained' : 'Overdue'}
                    size="small"
                    variant={neverMaintained ? 'outlined' : 'filled'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Button onClick={() => onViewVehicle(vehicle)} size="small">
                    View vehicle
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
