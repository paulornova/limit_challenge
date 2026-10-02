import {
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import type { MaintenanceRecord } from '@/lib/vehicles';

interface MaintenanceHistoryTableProps {
  records: MaintenanceRecord[];
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

// The API exposes a decimal amount but no ISO currency code; USD is the demo assumption.
const costFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

function formatDate(date: string) {
  return dateFormatter.format(new Date(`${date}T00:00:00`));
}

export default function MaintenanceHistoryTable({ records }: MaintenanceHistoryTableProps) {
  if (records.length === 0) {
    return <Alert severity="info">No maintenance records yet.</Alert>;
  }

  return (
    <Paper>
      <TableContainer>
        <Table aria-label="Maintenance history" sx={{ minWidth: 960 }}>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Maintenance type</TableCell>
              <TableCell>Mechanic</TableCell>
              <TableCell>Certification</TableCell>
              <TableCell align="right">Cost</TableCell>
              <TableCell>Notes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record) => (
              <TableRow hover key={record.id}>
                <TableCell>{formatDate(record.maintenance_date)}</TableCell>
                <TableCell>{record.maintenance_type}</TableCell>
                <TableCell>{record.mechanic.name}</TableCell>
                <TableCell>{record.mechanic.certification_number}</TableCell>
                <TableCell align="right">{costFormatter.format(Number(record.cost))}</TableCell>
                <TableCell sx={{ maxWidth: 340, whiteSpace: 'normal', wordBreak: 'break-word' }}>
                  <Typography variant="body2">{record.notes || '—'}</Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
