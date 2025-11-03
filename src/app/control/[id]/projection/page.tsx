'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Title,
  Text,
  Paper,
  Table,
  Group,
  Stack,
  Badge,
  Skeleton,
  Button,
} from '@mantine/core';
import { useParams, useRouter } from 'next/navigation';
import { IconArrowLeft } from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

interface AccountProjection {
  accountId: string;
  accountName: string;
  bankName: string;
  months: {
    month: string;
    monthName: string;
    initialBalance: number;
    expectedIncome: number;
    expectedExpenses: number;
    finalBalance: number;
  }[];
}

interface ProjectionData {
  accounts: AccountProjection[];
  totalsByMonth: {
    month: string;
    monthName: string;
    totalIncome: number;
    totalExpenses: number;
    totalBalance: number;
  }[];
}

export default function ProjectionPage() {
  const params = useParams();
  const router = useRouter();
  const controlId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProjectionData | null>(null);

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

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="xl">
          <div>
            <Skeleton height={32} width={300} mb={8} />
            <Skeleton height={20} width={500} />
          </div>
          <Paper shadow="xs" p="md">
            <Skeleton height={400} />
          </Paper>
        </Stack>
      </Container>
    );
  }

  if (!data || data.accounts.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="xl">
          <div>
            <Title order={2}>Projeção Financeira</Title>
            <Text c="dimmed" size="sm">
              Projeção de receitas e despesas por conta bancária
            </Text>
          </div>
          <Paper shadow="xs" p="md">
            <Text c="dimmed" ta="center" py={32}>
              Nenhuma projeção disponível. Cadastre gastos provisionados e contas bancárias com controle de saldo ativado.
            </Text>
          </Paper>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <div>
            <Title order={2}>Projeção Financeira - Próximos 6 Meses</Title>
            <Text c="dimmed" size="sm">
              Projeção de receitas, despesas e saldo por conta bancária baseado em gastos provisionados
            </Text>
          </div>
          <Button
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => router.back()}
          >
            Voltar
          </Button>
        </Group>

        {/* Projeção por Conta Bancária */}
        {data.accounts.map((account) => (
          <Paper key={account.accountId} shadow="xs" p="md">
            <Group mb="md">
              <div>
                <Text fw={600} size="lg">{account.accountName}</Text>
                <Text size="sm" c="dimmed">{account.bankName}</Text>
              </div>
            </Group>

            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Mês</Table.Th>
                  <Table.Th>Saldo Inicial</Table.Th>
                  <Table.Th>Receitas</Table.Th>
                  <Table.Th>Despesas</Table.Th>
                  <Table.Th>Saldo Final</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {account.months.map((month) => (
                  <Table.Tr key={month.month}>
                    <Table.Td>
                      <Text fw={500}>{month.monthName}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>
                        R$ {month.initialBalance.toFixed(2)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c="green" fw={500}>
                        + R$ {month.expectedIncome.toFixed(2)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text c="red" fw={500}>
                        - R$ {month.expectedExpenses.toFixed(2)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge 
                        size="lg" 
                        color={month.finalBalance >= 0 ? 'teal' : 'red'}
                        variant="light"
                      >
                        R$ {month.finalBalance.toFixed(2)}
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        ))}

        {/* Totais Consolidados */}
        <Paper shadow="xs" p="md">
          <Title order={3} mb="md">Resumo Consolidado</Title>
          
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Mês</Table.Th>
                <Table.Th>Total Receitas</Table.Th>
                <Table.Th>Total Despesas</Table.Th>
                <Table.Th>Resultado</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.totalsByMonth.map((total) => (
                <Table.Tr key={total.month}>
                  <Table.Td>
                    <Text fw={600}>{total.monthName}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text c="green" fw={600} size="lg">
                      R$ {total.totalIncome.toFixed(2)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text c="red" fw={600} size="lg">
                      R$ {total.totalExpenses.toFixed(2)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge 
                      size="xl" 
                      color={total.totalBalance >= 0 ? 'teal' : 'orange'}
                      variant="filled"
                    >
                      {total.totalBalance >= 0 ? '+' : ''} R$ {total.totalBalance.toFixed(2)}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Paper>

        <Text size="xs" c="dimmed" ta="center">
          💡 Esta projeção considera o saldo atual das contas + gastos provisionados (recorrentes e parcelados).
          Não inclui transferências futuras nem gastos não provisionados.
        </Text>
      </Stack>
    </Container>
  );
}
