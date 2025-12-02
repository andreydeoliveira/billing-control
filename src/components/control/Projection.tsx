'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Text,
  Paper,
  Table,
  Stack,
  Badge,
  Skeleton,
  Modal,
  Group,
} from '@mantine/core';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

interface MonthData {
  month: string;
  monthName: string;
  initialBalance: number;
  expectedIncome: number;
  expectedExpenses: number;
  finalBalance: number;
    transactions: {
    name: string;
    type: string;
    amount: number;
    isRecurring: boolean;
    installments: number | null;
    currentInstallment: number | null;
  }[];
    breakdown?: {
      provisioned: {
        name: string;
        type: string;
        amount: number;
        isRecurring: boolean;
        installments: number | null;
        currentInstallment: number | null;
      }[];
      paidTransactions: { name: string; type: string; amount: number }[];
      transfers: { direction: 'in' | 'out'; amount: number }[];
    };
}

interface AccountProjection {
  accountId: string;
  accountName: string;
  bankName: string;
  months: MonthData[];
}

interface ProjectionData {
  accounts: AccountProjection[];
}

interface ProjectionProps {
  controlId: string;
}

interface DetailModalData {
  accountName: string;
  bankName: string;
  monthName: string;
  initialBalance: number;
  expectedIncome: number;
  expectedExpenses: number;
  finalBalance: number;
  transactions: {
    name: string;
    type: string;
    amount: number;
    isRecurring: boolean;
    installments: number | null;
    currentInstallment: number | null;
  }[];
  breakdown?: {
    provisioned: {
      name: string;
      type: string;
      amount: number;
      isRecurring: boolean;
      installments: number | null;
      currentInstallment: number | null;
    }[];
    paidTransactions: { name: string; type: string; amount: number }[];
    transfers: { direction: 'in' | 'out'; amount: number }[];
  };
}

export function Projection({ controlId }: ProjectionProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProjectionData | null>(null);
  const [detailModal, setDetailModal] = useState<DetailModalData | null>(null);

  useEffect(() => {
    const loadProjection = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/financial-controls/${controlId}/projection-detailed`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Erro ao carregar projeção:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjection();
  }, [controlId]);

  const handleCellDoubleClick = (account: AccountProjection, monthData: MonthData) => {
    setDetailModal({
      accountName: account.accountName,
      bankName: account.bankName,
      monthName: monthData.monthName,
      initialBalance: monthData.initialBalance,
      expectedIncome: monthData.expectedIncome,
      expectedExpenses: monthData.expectedExpenses,
      finalBalance: monthData.finalBalance,
      transactions: monthData.transactions,
      breakdown: monthData.breakdown,
    });
  };

  if (loading) {
    return (
      <Stack gap="md">
        <Skeleton height={40} width={300} />
        <Paper p="md" withBorder>
          <Skeleton height={400} />
        </Paper>
      </Stack>
    );
  }

  if (!data || data.accounts.length === 0) {
    return (
      <Stack gap="md">
        <Title order={2}>Projeção Financeira</Title>
        <Paper p="xl" withBorder>
          <Text c="dimmed" ta="center">
            Nenhuma projeção disponível. Certifique-se de que:
          </Text>
          <Text c="dimmed" ta="center" mt="xs">
            1. Pelo menos uma conta bancária tem &quot;Controlar Saldo&quot; ativo
          </Text>
          <Text c="dimmed" ta="center">
            2. Existem gastos/receitas provisionados cadastrados
          </Text>
        </Paper>
      </Stack>
    );
  }

  // Pegar os meses da primeira conta (todas têm os mesmos meses)
  const months = data.accounts[0]?.months || [];

  return (
    <Stack gap="md">
      <Title order={2}>Projeção Financeira</Title>

      <Paper p="md" withBorder style={{ overflowX: 'auto' }}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th style={{ minWidth: '200px' }}>Conta Bancária</Table.Th>
              {months.map((month) => (
                <Table.Th key={month.month} style={{ minWidth: '150px', textAlign: 'center' }}>
                  {month.monthName}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.accounts.map((account) => (
              <Table.Tr key={account.accountId}>
                <Table.Td>
                  <div>
                    <Text fw={500}>{account.accountName}</Text>
                    <Text size="xs" c="dimmed">{account.bankName}</Text>
                  </div>
                </Table.Td>
                {account.months.map((monthData) => (
                  <Table.Td
                    key={monthData.month}
                    style={{ textAlign: 'center', cursor: 'pointer' }}
                    onDoubleClick={() => handleCellDoubleClick(account, monthData)}
                  >
                    <Badge
                      size="lg"
                      color={monthData.finalBalance >= 0 ? 'teal' : 'red'}
                      variant="light"
                    >
                      {formatCurrency(monthData.finalBalance)}
                    </Badge>
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>

      <Text size="sm" c="dimmed" ta="center">
        💡 Dica: Clique duas vezes em uma célula para ver os detalhes do mês
      </Text>

      {/* Modal de detalhes */}
      <Modal
        opened={!!detailModal}
        onClose={() => setDetailModal(null)}
        title={detailModal ? `${detailModal.accountName} - ${detailModal.monthName}` : ''}
        size="lg"
      >
        {detailModal && (
          <Stack gap="md">
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <Text size="sm" c="dimmed">Saldo Inicial</Text>
                <Text fw={500}>{formatCurrency(detailModal.initialBalance)}</Text>
              </Group>
            </Paper>

            {/* Lista de Transações Previstas */}
            {detailModal.transactions.length > 0 && (
              <Paper p="md" withBorder>
                <Text size="sm" fw={600} mb="sm">Transações Previstas</Text>
                <Stack gap="xs">
                  {detailModal.transactions.map((transaction, index) => (
                    <Group key={index} justify="space-between" p="xs" style={{ borderRadius: 4, backgroundColor: 'var(--mantine-color-gray-0)' }}>
                      <div>
                        <Text size="sm" fw={500}>{transaction.name}</Text>
                        <Text size="xs" c="dimmed">
                          {transaction.isRecurring ? 'Recorrente' : 
                           transaction.installments ? `Parcela ${transaction.currentInstallment}/${transaction.installments}` : 
                           'Único'}
                        </Text>
                      </div>
                      <Text 
                        size="sm" 
                        fw={600}
                        c={transaction.type === 'income' ? 'teal' : 'red'}
                      >
                        {transaction.type === 'income' ? '+' : '-'} {formatCurrency(transaction.amount)}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            )}

            {/* Transações Pagas no mês (apenas mês atual) */}
            {detailModal.breakdown && detailModal.breakdown.paidTransactions && detailModal.breakdown.paidTransactions.length > 0 && (
              <Paper p="md" withBorder>
                <Text size="sm" fw={600} mb="sm">Transações Pagas</Text>
                <Stack gap="xs">
                  {detailModal.breakdown.paidTransactions.map((tx, idx) => (
                    <Group key={idx} justify="space-between" p="xs" style={{ borderRadius: 4, backgroundColor: 'var(--mantine-color-gray-0)' }}>
                      <Text size="sm" fw={500}>{tx.name}</Text>
                      <Text size="sm" fw={700} c={tx.type === 'income' ? 'teal' : 'red'}>
                        {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            )}

            {/* Transferências no mês (apenas mês atual) */}
            {detailModal.breakdown && detailModal.breakdown.transfers && detailModal.breakdown.transfers.length > 0 && (
              <Paper p="md" withBorder>
                <Text size="sm" fw={600} mb="sm">Transferências</Text>
                <Stack gap="xs">
                  {detailModal.breakdown.transfers.map((tr, idx) => (
                    <Group key={idx} justify="space-between" p="xs" style={{ borderRadius: 4, backgroundColor: 'var(--mantine-color-gray-0)' }}>
                      <Text size="sm" fw={500}>{tr.direction === 'in' ? 'Entrada' : 'Saída'}</Text>
                      <Text size="sm" fw={700} c={tr.direction === 'in' ? 'teal' : 'red'}>
                        {tr.direction === 'in' ? '+' : '-'} {formatCurrency(tr.amount)}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            )}

            <Paper p="md" withBorder style={{ backgroundColor: 'var(--mantine-color-teal-0)' }}>
              <Group justify="space-between">
                <Text size="sm" c="teal">Total de Receitas</Text>
                <Text fw={700} c="teal">+ {formatCurrency(detailModal.expectedIncome)}</Text>
              </Group>
            </Paper>

            <Paper p="md" withBorder style={{ backgroundColor: 'var(--mantine-color-red-0)' }}>
              <Group justify="space-between">
                <Text size="sm" c="red">Total de Despesas</Text>
                <Text fw={700} c="red">- {formatCurrency(detailModal.expectedExpenses)}</Text>
              </Group>
            </Paper>

            <Paper p="md" withBorder style={{ backgroundColor: detailModal.finalBalance >= 0 ? 'var(--mantine-color-teal-1)' : 'var(--mantine-color-red-1)' }}>
              <Group justify="space-between">
                <Text size="sm" fw={700}>Saldo Final</Text>
                <Text fw={700} size="lg" c={detailModal.finalBalance >= 0 ? 'teal' : 'red'}>
                  {formatCurrency(detailModal.finalBalance)}
                </Text>
              </Group>
            </Paper>

            <Text size="xs" c="dimmed" ta="center">
              {detailModal.bankName}
            </Text>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
