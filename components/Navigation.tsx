'use client';

import { AppShell, Group, Button } from '@mantine/core';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import UserInfo from './UserInfo';

interface NavigationProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
}

export function Navigation({ children, isAuthenticated: initialAuth }: NavigationProps) {
  const pathname = usePathname();
  const [showNav, setShowNav] = useState(false);

  const isActive = (path: string) => pathname === path;
  
  // Verificar se deve mostrar navegação
  const isAuthPage = pathname?.startsWith('/auth');

  useEffect(() => {
    // Só mostrar navegação se estiver autenticado e não estiver em página de auth
    setShowNav(initialAuth && !isAuthPage);
  }, [initialAuth, isAuthPage]);

  // Sempre renderizar sem navegação em páginas de auth
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Não mostrar navegação se não estiver autenticado
  if (!showNav) {
    return <>{children}</>;
  }

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
          
          <UserInfo />
        </Group>
      </AppShell.Header>

      <AppShell.Main p={0}>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}

