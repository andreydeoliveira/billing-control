'use client';

import { useEffect, useState } from 'react';
import { 
  Container, 
  Title, 
  Grid, 
  Paper, 
  Text, 
  Badge,
  Table,
  Stack,
  Group,
  RingProgress,
  SimpleGrid,
  Card,
  ThemeIcon,
} from '@mantine/core';
import { IconAlertCircle, IconCheck, IconClock, IconWallet } from '@tabler/icons-react';
import { BarChart } from '@mantine/charts';

interface DashboardData {
  transacoesPendentes: Array<{
    id: string;
    descricao: string;
    valor: number;
    data: string;
    conta: {
      nome: string;
      categoria: {
        nome: string;
      };
    } | null;
  }>;
  despesasPorCategoria: Array<{
    categoria: string;
    total: number;
    pendente: number;
    pago: number;
    percentual: number;
  }>;
  totalGeral: number;
  totalPendente: number;
  totalPago: number;
}

export default function HomeClient({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const percentualPago = data.totalGeral > 0 ? (data.totalPago / data.totalGeral) * 100 : 0;
  const percentualPendente = data.totalGeral > 0 ? (data.totalPendente / data.totalGeral) * 100 : 0;

  // Dados para o gráfico de barras
  const chartData = data.despesasPorCategoria.map(item => ({
    categoria: item.categoria,
    Pago: item.pago,
    Pendente: item.pendente,
  }));

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Title order={1}>Dashboard Financeiro</Title>

        {/* Cards de resumo */}
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="apart" mb="xs">
              <Text fw={500}>Total do Mês</Text>
              <ThemeIcon color="blue" variant="light" radius="xl" size="lg">
                <IconWallet size={20} />
              </ThemeIcon>
            </Group>
            <Text size="xl" fw={700} c="blue">
              {formatCurrency(data.totalGeral)}
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="apart" mb="xs">
              <Text fw={500}>Pago</Text>
              <ThemeIcon color="green" variant="light" radius="xl" size="lg">
                <IconCheck size={20} />
              </ThemeIcon>
            </Group>
            <Text size="xl" fw={700} c="green">
              {formatCurrency(data.totalPago)}
            </Text>
            <Text size="sm" c="dimmed" mt={5}>
              {percentualPago.toFixed(1)}% do total
            </Text>
          </Card>

          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="apart" mb="xs">
              <Text fw={500}>Pendente</Text>
              <ThemeIcon color="orange" variant="light" radius="xl" size="lg">
                <IconClock size={20} />
              </ThemeIcon>
            </Group>
            <Text size="xl" fw={700} c="orange">
              {formatCurrency(data.totalPendente)}
            </Text>
            <Text size="sm" c="dimmed" mt={5}>
              {percentualPendente.toFixed(1)}% do total
            </Text>
          </Card>
        </SimpleGrid>

        <Grid>
          {/* Gráfico de barras */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Paper shadow="sm" p="md" withBorder>
              <Title order={3} mb="md">Despesas por Categoria</Title>
              {chartData.length > 0 ? (
                <BarChart
                  h={300}
                  data={chartData}
                  dataKey="categoria"
                  series={[
                    { name: 'Pago', color: 'green.6' },
                    { name: 'Pendente', color: 'orange.6' },
                  ]}
                  tickLine="y"
                />
              ) : (
                <Text c="dimmed" ta="center" py={50}>
                  Nenhuma despesa registrada neste mês
                </Text>
              )}
            </Paper>
          </Grid.Col>

          {/* Gráfico de pizza (Ring Progress) */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Paper shadow="sm" p="md" withBorder>
              <Title order={3} mb="md">Status dos Pagamentos</Title>
              <Stack align="center" gap="lg">
                <RingProgress
                  size={200}
                  thickness={20}
                  sections={[
                    { value: percentualPago, color: 'green', tooltip: `Pago: ${formatCurrency(data.totalPago)}` },
                    { value: percentualPendente, color: 'orange', tooltip: `Pendente: ${formatCurrency(data.totalPendente)}` },
                  ]}
                  label={
                    <Stack gap={0} align="center">
                      <Text size="lg" ta="center" fw={700}>
                        {data.totalGeral > 0 ? `${percentualPago.toFixed(0)}%` : '0%'}
                      </Text>
                      <Text size="sm" c="dimmed" fw={400}>
                        Pago
                      </Text>
                    </Stack>
                  }
                />
                <Group gap="xl">
                  <Stack gap={5} align="center">
                    <Badge color="green" size="lg">Pago</Badge>
                    <Text size="sm" fw={500}>{formatCurrency(data.totalPago)}</Text>
                  </Stack>
                  <Stack gap={5} align="center">
                    <Badge color="orange" size="lg">Pendente</Badge>
                    <Text size="sm" fw={500}>{formatCurrency(data.totalPendente)}</Text>
                  </Stack>
                </Group>
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Tabela de despesas por categoria */}
        <Paper shadow="sm" p="md" withBorder>
          <Title order={3} mb="md">Despesas por Classificação</Title>
          {data.despesasPorCategoria.length > 0 ? (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Categoria</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Total</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Pago</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Pendente</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>% do Total</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.despesasPorCategoria.map((item) => (
                  <Table.Tr key={item.categoria}>
                    <Table.Td>
                      <Text fw={500}>{item.categoria}</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text fw={700}>{formatCurrency(item.total)}</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text c="green">{formatCurrency(item.pago)}</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text c="orange">{formatCurrency(item.pendente)}</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Badge variant="light" size="lg">
                        {item.percentual.toFixed(1)}%
                      </Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Text c="dimmed" ta="center" py={30}>
              Nenhuma despesa registrada neste mês
            </Text>
          )}
        </Paper>

        {/* Lista de contas pendentes */}
        {data.transacoesPendentes.length > 0 && (
          <Paper shadow="sm" p="md" withBorder>
            <Group justify="apart" mb="md">
              <Title order={3}>Contas Pendentes</Title>
              <Badge color="orange" size="lg" leftSection={<IconAlertCircle size={14} />}>
                {data.transacoesPendentes.length} {data.transacoesPendentes.length === 1 ? 'conta' : 'contas'}
              </Badge>
            </Group>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Data</Table.Th>
                  <Table.Th>Descrição</Table.Th>
                  <Table.Th>Categoria</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>Valor</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.transacoesPendentes.map((transacao) => (
                  <Table.Tr key={transacao.id}>
                    <Table.Td>
                      <Text size="sm">{formatDate(transacao.data)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>{transacao.descricao}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light">
                        {transacao.conta?.categoria.nome || 'Sem categoria'}
                      </Badge>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text fw={700} c="orange">
                        {formatCurrency(transacao.valor)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
