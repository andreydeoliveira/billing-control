'use client';

import { AppShell, Group, Button, Burger, Stack, Drawer, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconHome, IconReceipt, IconFileText, IconChartLine, IconWallet } from '@tabler/icons-react';
import { usePathname, useRouter } from 'next/navigation';

export function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [opened, { toggle, close }] = useDisclosure();

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

          {/* Mobile - Burger */}
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />

          {/* Logo - Direita */}
          <Group gap="xs" ml="auto" visibleFrom="sm">
            <IconWallet size={24} stroke={2} />
            <Text size="lg" fw={700}>FinControl</Text>
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
        </Stack>
      </Drawer>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
