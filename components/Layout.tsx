'use client';

import { AppShell, Group, Button, Burger, Stack, Drawer, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconHome, IconReceipt, IconFileText, IconChartLine, IconWallet } from '@tabler/icons-react';
import { usePathname, useRouter } from 'next/navigation';
import UserInfo from './UserInfo';

interface LayoutProps {
  children: React.ReactNode;
  isAuthenticated?: boolean;
}

export function Layout({ children, isAuthenticated = false }: LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [opened, { toggle, close }] = useDisclosure();

  const isAuthPage = pathname?.startsWith('/auth');
  const showNav = isAuthenticated && !isAuthPage;

  // Não mostrar navegação em páginas de auth ou se não está autenticado
  if (isAuthPage || !showNav) {
    return <>{children}</>;
  }

  const menuItems = [
    { label: 'Home', href: '/', icon: IconHome },
    { label: 'Transações', href: '/transacoes', icon: IconReceipt },
    { label: 'Cadastros', href: '/cadastros', icon: IconFileText },
    { label: 'Previsão', href: '/previsao', icon: IconChartLine },
  ];

  const handleNavigation = (href: string) => {
    router.push(href);
    close();
  };

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" gap="md" align="center" justify="space-between">
          {/* Desktop Menu - Esquerda */}
          <Group gap="xs" visibleFrom="sm">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.href}
                  variant={pathname === item.href ? 'light' : 'subtle'}
                  leftSection={<Icon size={18} />}
                  onClick={() => router.push(item.href)}
                  size="sm"
                >
                  {item.label}
                </Button>
              );
            })}
          </Group>

          {/* Botão Extrato */}
          <Button
            onClick={() => router.push('/extrato')}
            variant={pathname === '/extrato' ? 'light' : 'subtle'}
            color="cyan"
            size="sm"
            visibleFrom="sm"
          >
            Extrato
          </Button>

          {/* Mobile - Burger */}
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />

          {/* User Info e Logo */}
          <Group gap="md" ml="auto">
            <UserInfo />
          </Group>
        </Group>
      </AppShell.Header>

      {/* Mobile Drawer */}
      <Drawer
        opened={opened}
        onClose={close}
        title="Menu"
        padding="md"
        size="xs"
        hiddenFrom="sm"
      >
        <Stack gap="xs">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Button
                key={item.href}
                variant={pathname === item.href ? 'light' : 'subtle'}
                leftSection={<Icon size={18} />}
                onClick={() => handleNavigation(item.href)}
                fullWidth
                justify="flex-start"
              >
                {item.label}
              </Button>
            );
          })}
          <Button
            variant={pathname === '/extrato' ? 'light' : 'subtle'}
            onClick={() => handleNavigation('/extrato')}
            fullWidth
            justify="flex-start"
            color="cyan"
          >
            Extrato
          </Button>
        </Stack>
      </Drawer>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
