import {
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import type { MechanicWorkload } from '@/lib/mechanics';

interface MechanicWorkloadTableProps {
  mechanics: MechanicWorkload[];
  onDelete: (mechanic: MechanicWorkload) => void;
  onEdit: (mechanic: MechanicWorkload) => void;
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  currency: 'USD',
  style: 'currency',
});

export default function MechanicWorkloadTable({
  mechanics,
  onDelete,
  onEdit,
}: MechanicWorkloadTableProps) {
  return (
    <TableContainer component={Paper}>
      <Table aria-label="Mechanic workload" sx={{ minWidth: 760 }}>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Certification</TableCell>
            <TableCell align="right">Services this year</TableCell>
            <TableCell align="right">Maintenance value this year</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {mechanics.map((mechanic) => (
            <TableRow hover key={mechanic.id}>
              <TableCell>{mechanic.name}</TableCell>
              <TableCell>{mechanic.certification_number}</TableCell>
              <TableCell align="right">{mechanic.maintenance_count_current_year}</TableCell>
              <TableCell align="right">
                {currencyFormatter.format(Number(mechanic.maintenance_cost_current_year))}
              </TableCell>
              <TableCell align="right">
                <Button onClick={() => onEdit(mechanic)} size="small">
                  Edit
                </Button>
                <Button color="error" onClick={() => onDelete(mechanic)} size="small">
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
