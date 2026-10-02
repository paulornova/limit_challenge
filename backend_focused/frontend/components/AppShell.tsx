import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material';
import Link from 'next/link';
import type { PropsWithChildren } from 'react';

export default function AppShell({ children }: PropsWithChildren) {
  return (
    <Box minHeight="100vh">
      <AppBar position="sticky" elevation={0}>
        <Toolbar>
          <Typography component="span" variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Fleet Tracker
          </Typography>
          <Link href="/vehicles" style={{ color: 'inherit', textDecoration: 'none' }}>
            <Button color="inherit">Vehicles</Button>
          </Link>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        {children}
      </Container>
    </Box>
  );
}
