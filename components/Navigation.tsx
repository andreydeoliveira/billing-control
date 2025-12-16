'use client';

import { AppShell, Group, Button } from '@mantine/core';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <AppShell
      header={{ height: 60 }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Button
              component={Link}
              href="/cadastros"
              variant={isActive('/cadastros') ? 'filled' : 'subtle'}
            >
              Cadastros
            </Button>
            <Button
              component={Link}
              href="/transacoes"
              variant={isActive('/transacoes') ? 'filled' : 'subtle'}
            >
              Transações
            </Button>
            <Button
              component={Link}
              href="/previsao"
              variant={isActive('/previsao') ? 'filled' : 'subtle'}
            >
              Previsão
            </Button>
            <Button
              component={Link}
              href="/extrato"
              variant={isActive('/extrato') ? 'filled' : 'subtle'}
              color="cyan"
            >
              Extrato
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main p={0}>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}

