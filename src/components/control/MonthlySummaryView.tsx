'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
  Title,
  Text,
  Select,
  Table,
  Group,
  Stack,
  Tabs,
  Badge,
  Skeleton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';

interface MonthlySummaryData {
  accountId?: string;
  accountName?: string;
  accountType?: string;
  classificationId?: string | null;
  classificationName?: string | null;
  monthYear: string;
  total: number;
}

interface MonthlySummaryViewProps {
  controlId: string;
}

export function MonthlySummaryView({ controlId }: MonthlySummaryViewProps) {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [summaryData, setSummaryData] = useState<MonthlySummaryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('account');

  const months = [
    '01', '02', '03', '04', '05', '06',
    '07', '08', '09', '10', '11', '12'
  ];

  const monthNames = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/financial-controls/${controlId}/monthly-summary?groupBy=${activeTab}&year=${year}`
      );
      if (response.ok) {
        const data = await response.json();
        setSummaryData(data);
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível carregar os dados',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  }, [controlId, year, activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Agrupar dados por linha (conta ou classificação)
  const groupedData = summaryData.reduce((acc, item) => {
    const key = activeTab === 'account' 
      ? item.accountName || 'Sem nome'
      : item.classificationName || 'Não informado';
    
    if (!acc[key]) {
      acc[key] = {
        name: key,
        type: item.accountType,
        months: {},
      };
    }

    acc[key].months[item.monthYear] = Number(item.total) || 0;
    return acc;
  }, {} as Record<string, { name: string; type?: string; months: Record<string, number> }>);

  const rows = Object.values(groupedData);

  const yearOptions = [];
  const currentYear = new Date().getFullYear();
  for (let i = currentYear - 2; i <= currentYear + 1; i++) {
    yearOptions.push({ value: i.toString(), label: i.toString() });
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Resumo Mensal</Title>
        <Select
          data={yearOptions}
          value={year}
          onChange={(value) => setYear(value || currentYear.toString())}
          style={{ width: 120 }}
        />
      </Group>

      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'account')}>
        <Tabs.List>
          <Tabs.Tab value="account">Por Conta</Tabs.Tab>
          <Tabs.Tab value="classification">Por Classificação</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="account" pt="md">
          <Paper shadow="xs" p="md">
            <div style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Conta</Table.Th>
                    <Table.Th>Tipo</Table.Th>
                    {monthNames.map((month, idx) => (
                      <Table.Th key={idx} style={{ textAlign: 'right' }}>{month}</Table.Th>
                    ))}
                    <Table.Th style={{ textAlign: 'right' }}>Total</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {loading ? (
                    <Table.Tr>
                      <Table.Td colSpan={14}>
                        <Skeleton height={20} />
                      </Table.Td>
                    </Table.Tr>
                  ) : rows.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={14} style={{ textAlign: 'center', padding: 32 }}>
                        <Text c="dimmed">Nenhum dado encontrado para {year}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    rows.map((row) => {
                      const yearTotal = months.reduce((sum, month) => {
                        return sum + (row.months[`${year}-${month}`] || 0);
                      }, 0);

                      return (
                        <Table.Tr key={row.name}>
                          <Table.Td>{row.name}</Table.Td>
                          <Table.Td>
                            {row.type === 'income' ? (
                              <Badge color="green" variant="light">Receita</Badge>
                            ) : row.type === 'expense' ? (
                              <Badge color="red" variant="light">Despesa</Badge>
                            ) : null}
                          </Table.Td>
                          {months.map((month) => {
                            const value = row.months[`${year}-${month}`] || 0;
                            return (
                              <Table.Td key={month} style={{ textAlign: 'right' }}>
                                {value > 0 ? `R$ ${value.toFixed(2)}` : '-'}
                              </Table.Td>
                            );
                          })}
                          <Table.Td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            R$ {yearTotal.toFixed(2)}
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  )}
                </Table.Tbody>
              </Table>
            </div>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="classification" pt="md">
          <Paper shadow="xs" p="md">
            <div style={{ overflowX: 'auto' }}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Classificação</Table.Th>
                    {monthNames.map((month, idx) => (
                      <Table.Th key={idx} style={{ textAlign: 'right' }}>{month}</Table.Th>
                    ))}
                    <Table.Th style={{ textAlign: 'right' }}>Total</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {loading ? (
                    <Table.Tr>
                      <Table.Td colSpan={14}>
                        <Skeleton height={20} />
                      </Table.Td>
                    </Table.Tr>
                  ) : rows.length === 0 ? (
                    <Table.Tr>
                      <Table.Td colSpan={14} style={{ textAlign: 'center', padding: 32 }}>
                        <Text c="dimmed">Nenhum dado encontrado para {year}</Text>
                      </Table.Td>
                    </Table.Tr>
                  ) : (
                    rows.map((row) => {
                      const yearTotal = months.reduce((sum, month) => {
                        return sum + (row.months[`${year}-${month}`] || 0);
                      }, 0);

                      return (
                        <Table.Tr key={row.name}>
                          <Table.Td>
                            {row.name}
                            {row.name === 'Não informado' && (
                              <Text size="xs" c="dimmed"> (sem classificação)</Text>
                            )}
                          </Table.Td>
                          {months.map((month) => {
                            const value = row.months[`${year}-${month}`] || 0;
                            return (
                              <Table.Td key={month} style={{ textAlign: 'right' }}>
                                {value > 0 ? `R$ ${value.toFixed(2)}` : '-'}
                              </Table.Td>
                            );
                          })}
                          <Table.Td style={{ textAlign: 'right', fontWeight: 'bold' }}>
                            R$ {yearTotal.toFixed(2)}
                          </Table.Td>
                        </Table.Tr>
                      );
                    })
                  )}
                </Table.Tbody>
              </Table>
            </div>
          </Paper>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
