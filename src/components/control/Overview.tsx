'use client';

import { useState, useEffect } from 'react';
import { Paper, Title, Text, Group, SimpleGrid, Stack, Alert, Skeleton } from '@mantine/core';
import { IconTrendingUp, IconTrendingDown, IconWallet, IconCreditCard, IconAlertCircle } from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

interface OverviewProps {
  controlId: string;
}

interface StatCardProps {
  title: string;
  value: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  color: string;
}

interface UpcomingInvoice {
  id: string;
  cardName: string;
  totalAmount: string;
  dueDate: string;
}

interface OverviewData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  creditCardDebt: number;
  alerts: {
    upcomingInvoices: number;
    unpaidTransactions: number;
  };
  upcomingInvoicesDetails: UpcomingInvoice[];
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <Paper shadow="xs" p="md">
      <Group>
        <div style={{ flex: 1 }}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {title}
          </Text>
          <Text fw={700} size="xl" c={color}>
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(value)}
          </Text>
        </div>
        <Icon size={32} color={color} />
      </Group>
    </Paper>
  );
}

export function Overview({ controlId }: OverviewProps) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const response = await fetch(`/api/financial-controls/${controlId}/overview`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Erro ao carregar overview:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOverview();
  }, [controlId]);

  if (loading) {
    return (
      <div>
        <Stack gap="xl">
          <div>
            <Skeleton height={32} width={200} mb={8} />
            <Skeleton height={20} width={300} />
          </div>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
            {Array(4).fill(0).map((_, i) => (
              <Paper key={`skeleton-stat-${i}`} shadow="xs" p="md">
                <Group>
                  <div style={{ flex: 1 }}>
                    <Skeleton height={16} width={120} mb={8} />
                    <Skeleton height={28} width={150} />
                  </div>
                  <Skeleton height={32} circle />
                </Group>
              </Paper>
            ))}
          </SimpleGrid>

          <Paper shadow="xs" p="md">
            <Skeleton height={24} width={180} mb="md" />
            <Group justify="space-between" grow>
              <div>
                <Skeleton height={16} width={120} mb={8} />
                <Skeleton height={28} width={150} />
              </div>
              <div>
                <Skeleton height={16} width={120} mb={8} />
                <Skeleton height={28} width={150} />
              </div>
              <div>
                <Skeleton height={16} width={120} mb={8} />
                <Skeleton height={28} width={150} />
                <Skeleton height={14} width={80} />
              </div>
            </Group>
          </Paper>

          <Stack gap="md">
            <Skeleton height={24} width={150} />
            <Paper shadow="xs" p="md">
              <Skeleton height={20} width="100%" mb={8} />
              <Skeleton height={20} width="100%" mb={8} />
              <Skeleton height={20} width="100%" />
            </Paper>
          </Stack>
        </Stack>
      </div>
    );
  }

  if (!data) {
    return (
      <Alert color="red" title="Erro" icon={<IconAlertCircle />}>
        Não foi possível carregar os dados da visão geral
      </Alert>
    );
  }

  return (
    <div>
      <Stack gap="xl">
        <div>
          <Title order={2}>Visão Geral</Title>
          <Text c="dimmed" size="sm">
            Resumo das suas finanças - {dayjs().format('MMMM/YYYY')}
          </Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
          <StatCard
            title="Saldo Total"
            value={data.totalBalance}
            icon={IconWallet}
            color="blue"
          />
          <StatCard
            title="Receitas do Mês"
            value={data.monthlyIncome}
            icon={IconTrendingUp}
            color="green"
          />
          <StatCard
            title="Despesas do Mês"
            value={data.monthlyExpenses}
            icon={IconTrendingDown}
            color="red"
          />
          <StatCard
            title="Faturas em Aberto"
            value={data.creditCardDebt}
            icon={IconCreditCard}
            color="orange"
          />
        </SimpleGrid>

        {/* Resumo do mês */}
        <Paper shadow="xs" p="md">
          <Title order={3} mb="md">Resumo do Mês</Title>
          
          <Group justify="space-between" grow>
            <div>
              <Text size="sm" c="dimmed">💰 Total de Receitas</Text>
              <Text size="xl" fw={700} c="green">
                R$ {data.monthlyIncome.toFixed(2)}
              </Text>
            </div>

            <div>
              <Text size="sm" c="dimmed">💸 Total de Despesas</Text>
              <Text size="xl" fw={700} c="red">
                R$ {data.monthlyExpenses.toFixed(2)}
              </Text>
            </div>

            <div>
              <Text size="sm" c="dimmed">📊 Resultado</Text>
              <Text 
                size="xl" 
                fw={700} 
                c={data.monthlyIncome - data.monthlyExpenses >= 0 ? 'teal' : 'red'}
              >
                R$ {(data.monthlyIncome - data.monthlyExpenses).toFixed(2)}
              </Text>
              <Text size="xs" c="dimmed">
                {data.monthlyIncome - data.monthlyExpenses >= 0 ? 'Superávit' : 'Déficit'}
              </Text>
            </div>
          </Group>
        </Paper>

        {/* Alertas */}
        {(data.alerts.upcomingInvoices > 0 || data.alerts.unpaidTransactions > 0) && (
          <Stack gap="md">
            <Title order={3}>⚠️ Alertas</Title>
            
            {data.alerts.upcomingInvoices > 0 && (
              <Alert color="orange" title="Faturas vencendo nos próximos 7 dias" icon={<IconAlertCircle />}>
                <Text size="sm" mb="sm">
                  Você tem {data.alerts.upcomingInvoices} fatura(s) vencendo em breve:
                </Text>
                <Stack gap="xs">
                  {data.upcomingInvoicesDetails.map((invoice) => (
                    <Group key={invoice.id} justify="space-between">
                      <div>
                        <Text size="sm" fw={500}>{invoice.cardName}</Text>
                        <Text size="xs" c="dimmed">
                          Vence em: {dayjs(invoice.dueDate).format('DD/MM/YYYY')}
                        </Text>
                      </div>
                      <Text size="sm" fw={600} c="orange">
                        R$ {parseFloat(invoice.totalAmount).toFixed(2)}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Alert>
            )}

            {data.alerts.unpaidTransactions > 0 && (
              <Alert color="yellow" title="Transações não pagas" icon={<IconAlertCircle />}>
                Você tem {data.alerts.unpaidTransactions} transação(ões) do mês ainda não marcadas como pagas.
              </Alert>
            )}
          </Stack>
        )}

        {/* Mensagem de sucesso se não houver alertas */}
        {data.alerts.upcomingInvoices === 0 && data.alerts.unpaidTransactions === 0 && (
          <Alert color="green" title="Tudo em dia!" icon={<IconAlertCircle />}>
            Não há pendências no momento. Continue assim! 🎉
          </Alert>
        )}
      </Stack>
    </div>
  );
}
