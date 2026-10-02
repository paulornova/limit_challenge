import { AppBar, Box, Button, Container, Toolbar } from '@mui/material';
import Image from 'next/image';
import Link from 'next/link';
import type { PropsWithChildren } from 'react';

export default function AppShell({ children }: PropsWithChildren) {
  return (
    <Box minHeight="100vh">
      <AppBar
        color="transparent"
        elevation={0}
        position="sticky"
        sx={{
          bgcolor: '#fefefe',
          borderBottom: '1px solid',
          borderColor: 'divider',
          color: '#054231',
        }}
      >
        <Toolbar>
          <Box sx={{ flexGrow: 1, lineHeight: 0 }}>
            <Image alt="Fleemit" height={36} priority src="/logo.png" width={144} />
          </Box>
          <Box display="flex" gap={0.5}>
            <Link href="/vehicles" style={{ color: 'inherit', textDecoration: 'none' }}>
              <Button color="inherit" sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                Vehicles
              </Button>
            </Link>
            <Link href="/maintenance-due" style={{ color: 'inherit', textDecoration: 'none' }}>
              <Button color="inherit" sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                Maintenance Due
              </Button>
            </Link>
          </Box>
        </Toolbar>
      </AppBar>
      <Container component="main" maxWidth="xl" sx={{ py: { xs: 3, md: 5 } }}>
        {children}
      </Container>
    </Box>
  );
}
