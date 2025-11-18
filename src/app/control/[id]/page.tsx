'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  AppShell,
  Burger,
  Group,
  Title,
  NavLink,
  Text,
  Loader,
  Center,
  ActionIcon,
  Avatar,
  Menu,
  rem,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconHome,
  IconWallet,
  IconCreditCard,
  IconReceipt,
  IconCalendarMonth,
  IconLogout,
  IconSettings,
  IconUsers,
  IconChartLine,
  IconList,
  IconFileInvoice,
  IconReportAnalytics,
  IconUserCog,
} from '@tabler/icons-react';
import { MonthlyView } from '@/components/control/MonthlyView';
import { BankAccounts } from '@/components/control/BankAccounts';
import { Cards } from '@/components/control/Cards';
import { ProvisionedTransactions } from '@/components/control/ProvisionedTransactions';
import { Overview } from '@/components/control/Overview';
import { Projection } from '@/components/control/Projection';
import { Accounts } from '@/components/control/Accounts';
import { MonthlySummaryView } from '@/components/control/MonthlySummaryView';

interface FinancialControl {
  id: string;
  name: string;
  createdAt: string;
}

export default function ControlPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const controlId = params.id as string;
  const [opened, { toggle }] = useDisclosure();
  
  const [control, setControl] = useState<FinancialControl | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('monthly');

  useEffect(() => {
    const loadControl = async () => {
      try {
        const response = await fetch(`/api/financial-controls/${controlId}`);
        if (response.ok) {
          const data = await response.json();
          setControl(data.control);
        } else {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Erro ao carregar controle:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadControl();
  }, [controlId, router]);

  const handleLogout = async () => {
    try {
      await signOut({ redirect: false });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      router.push('/auth/signin');
    }
  };

  const handleSettings = () => {
    router.push(`/control/${controlId}/settings`);
  };

  const handleMembers = () => {
    router.push(`/control/${controlId}/members`);
  };

  if (loading) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!control) {
    return null;
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Title order={3}>💰 {control.name}</Title>
          </Group>

          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="subtle" size="lg">
                <Avatar size="sm" radius="xl" color="blue">
                  U
                </Avatar>
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Minha Conta</Menu.Label>
              <Menu.Item 
                leftSection={<IconSettings style={{ width: rem(16), height: rem(16) }} />}
                onClick={handleSettings}
              >
                Configurações
              </Menu.Item>
              <Menu.Item
                leftSection={<IconUsers style={{ width: rem(16), height: rem(16) }} />}
                onClick={handleMembers}
              >
                Membros do Controle
              </Menu.Item>
              {session?.user?.email === 'andrey.oliveirasg@gmail.com' && (
                <Menu.Item
                  leftSection={<IconUsers style={{ width: rem(16), height: rem(16) }} />}
                  onClick={() => router.push('/admin/users')}
                >
                  Administração (Todos Usuários)
                </Menu.Item>
              )}
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconList style={{ width: rem(16), height: rem(16) }} />}
                onClick={() => {
                  router.push('/dashboard');
                }}
              >
                Meus Controles
              </Menu.Item>
              <Menu.Item
                color="red"
                leftSection={<IconLogout style={{ width: rem(16), height: rem(16) }} />}
                onClick={handleLogout}
              >
                Sair
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <AppShell.Section grow>
          <Text size="xs" fw={500} c="dimmed" mb="xs" tt="uppercase">
            Navegação
          </Text>

          <NavLink
            label="Visão Geral"
            leftSection={<IconHome size="1.2rem" />}
            active={activeView === 'overview'}
            onClick={() => setActiveView('overview')}
            description="Dashboard principal"
          />

          <NavLink
            label="Visão Mensal"
            leftSection={<IconCalendarMonth size="1.2rem" />}
            active={activeView === 'monthly'}
            onClick={() => setActiveView('monthly')}
            description="Lançamentos do mês"
          />

          <NavLink
            label="Projeção Financeira"
            leftSection={<IconChartLine size="1.2rem" />}
            active={activeView === 'projection'}
            onClick={() => setActiveView('projection')}
            description="Projeção próximos meses"
          />

          <NavLink
            label="Contas"
            leftSection={<IconFileInvoice size="1.2rem" />}
            active={activeView === 'accountsList'}
            onClick={() => setActiveView('accountsList')}
            description="Luz, Água, Uber, etc"
          />

          <NavLink
            label="Contas Bancárias"
            leftSection={<IconWallet size="1.2rem" />}
            active={activeView === 'accounts'}
            onClick={() => setActiveView('accounts')}
            description="Gerencie suas contas"
          />

          <NavLink
            label="Cartões"
            leftSection={<IconCreditCard size="1.2rem" />}
            active={activeView === 'cards'}
            onClick={() => setActiveView('cards')}
            description="Cartões de crédito/débito"
          />

          <NavLink
            label="Gastos Provisionados"
            leftSection={<IconReceipt size="1.2rem" />}
            active={activeView === 'provisioned'}
            onClick={() => setActiveView('provisioned')}
            description="Despesas recorrentes"
          />

          <NavLink
            label="Resumo Mensal"
            leftSection={<IconReportAnalytics size="1.2rem" />}
            active={activeView === 'summary'}
            onClick={() => setActiveView('summary')}
            description="Grids de resumo por conta/classificação"
          />
        </AppShell.Section>

        <AppShell.Section>
          <Text size="xs" c="dimmed" ta="center">
            Billing Control v1.0
          </Text>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        {activeView === 'monthly' && <MonthlyView controlId={control.id} />}
        {activeView === 'accountsList' && <Accounts controlId={control.id} />}
        {activeView === 'accounts' && <BankAccounts controlId={control.id} />}
        {activeView === 'cards' && <Cards controlId={control.id} />}
        {activeView === 'provisioned' && <ProvisionedTransactions controlId={control.id} />}
        {activeView === 'overview' && <Overview controlId={control.id} />}
        {activeView === 'projection' && <Projection controlId={control.id} />}
        {activeView === 'summary' && <MonthlySummaryView controlId={control.id} />}
      </AppShell.Main>
    </AppShell>
  );
}
