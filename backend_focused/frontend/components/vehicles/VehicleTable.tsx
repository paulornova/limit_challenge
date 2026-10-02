import {
  Box,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import type { Vehicle } from '@/lib/vehicles';

interface VehicleTableProps {
  vehicles: Vehicle[];
  isInitialLoading: boolean;
  isRefreshing: boolean;
  onDelete: (vehicle: Vehicle) => void;
  onDetails: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
}

const columns = ['VIN', 'License plate', 'Make / model', 'Year', 'Office', 'Status', 'Actions'];

function LoadingRows() {
  return Array.from({ length: 6 }, (_, index) => (
    <TableRow key={index}>
      {columns.map((column) => (
        <TableCell key={column}>
          <Skeleton width="80%" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

export default function VehicleTable({
  vehicles,
  isInitialLoading,
  isRefreshing,
  onDelete,
  onDetails,
  onEdit,
}: VehicleTableProps) {
  return (
    <Paper>
      {isRefreshing && <LinearProgress aria-label="Refreshing vehicle list" />}
      <TableContainer>
        <Table aria-label="Vehicle list" sx={{ minWidth: 760 }}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column}>{column}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {isInitialLoading ? (
              <LoadingRows />
            ) : (
              vehicles.map((vehicle) => (
                <TableRow hover key={vehicle.id}>
                  <TableCell>{vehicle.vin}</TableCell>
                  <TableCell>{vehicle.license_plate}</TableCell>
                  <TableCell>
                    <Typography fontWeight={600} variant="body2">
                      {vehicle.make}
                    </Typography>
                    <Typography color="text.secondary" variant="body2">
                      {vehicle.model}
                    </Typography>
                  </TableCell>
                  <TableCell>{vehicle.year}</TableCell>
                  <TableCell>Office #{vehicle.office}</TableCell>
                  <TableCell>
                    <Chip
                      color={vehicle.active ? 'success' : 'default'}
                      label={vehicle.active ? 'Active' : 'Inactive'}
                      size="small"
                      variant={vehicle.active ? 'filled' : 'outlined'}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={`View ${vehicle.license_plate} details`}>
                      <Button onClick={() => onDetails(vehicle)} size="small">
                        Details
                      </Button>
                    </Tooltip>
                    <Tooltip title={`Edit ${vehicle.license_plate}`}>
                      <Button onClick={() => onEdit(vehicle)} size="small">
                        Edit
                      </Button>
                    </Tooltip>
                    <Tooltip title={`Delete ${vehicle.license_plate}`}>
                      <Button color="error" onClick={() => onDelete(vehicle)} size="small">
                        Delete
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {!isInitialLoading && vehicles.length > 0 && (
        <Box px={2} py={1.5}>
          <Stack direction="row" justifyContent="space-between" spacing={2}>
            <Typography color="text.secondary" variant="body2">
              Showing {vehicles.length} vehicles on this page
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Scroll horizontally on smaller screens.
            </Typography>
          </Stack>
        </Box>
      )}
    </Paper>
  );
}
