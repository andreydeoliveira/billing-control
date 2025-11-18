'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Button,
  Group,
  Table,
  ActionIcon,
  Badge,
  Text,
  Textarea,
} from '@mantine/core';
import { IconPlus, IconPencil } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface MonthlyBalance {
  id: string;
  monthYear: string;
  finalBalance: string;
  yield: string;
  observation: string | null;
}

interface BankAccountYieldModalProps {
  controlId: string;
  bankAccountId: string;
  bankAccountName: string;
  opened: boolean;
  onClose: () => void;
}

export function BankAccountYieldModal({
  controlId,
  bankAccountId,
  bankAccountName,
  opened,
  onClose,
}: BankAccountYieldModalProps) {
  const [balances, setBalances] = useState<MonthlyBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingBalance, setEditingBalance] = useState<MonthlyBalance | null>(null);
  
  const [monthYear, setMonthYear] = useState('');
  const [finalBalance, setFinalBalance] = useState<number | ''>('');
  const [observation, setObservation] = useState('');

  const loadBalances = async () => {
    if (!opened) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        `/api/financial-controls/${controlId}/bank-account-balances?bankAccountId=${bankAccountId}`
      );
      const data = await response.json();

      if (response.ok) {
        setBalances(data);
      }
    } catch (error) {
      console.error('Erro ao carregar saldos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, bankAccountId]);

  const openBalanceModal = (balance?: MonthlyBalance) => {
    if (balance) {
      setEditingBalance(balance);
      setMonthYear(balance.monthYear);
      setFinalBalance(parseFloat(balance.finalBalance));
      setObservation(balance.observation || '');
    } else {
      setEditingBalance(null);
      const now = new Date();
      setMonthYear(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      setFinalBalance('');
      setObservation('');
    }
    setModalOpened(true);
  };

  const closeBalanceModal = () => {
    setModalOpened(false);
    setEditingBalance(null);
    setMonthYear('');
    setFinalBalance('');
    setObservation('');
  };

  const handleSubmit = async () => {
    if (!monthYear || finalBalance === '') {
      notifications.show({
        title: 'Erro',
        message: 'Mês/Ano e Saldo Final são obrigatórios',
        color: 'red',
      });
      return;
    }

    try {
      const response = await fetch(`/api/financial-controls/${controlId}/bank-account-balances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountId,
          monthYear,
          finalBalance: finalBalance.toString(),
          observation,
        }),
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Saldo salvo com sucesso',
          color: 'green',
        });
        closeBalanceModal();
        loadBalances();
      } else {
        const data = await response.json();
        notifications.show({
          title: 'Erro',
          message: data.error || 'Erro ao salvar saldo',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Erro ao salvar saldo:', error);
      notifications.show({
        title: 'Erro',
        message: 'Erro ao salvar saldo',
        color: 'red',
      });
    }
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={onClose}
        title={`Rendimentos - ${bankAccountName}`}
        size="xl"
      >
        <Stack gap="md">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Registre o saldo final de cada mês para acompanhar os rendimentos (CDI, poupança, etc)
            </Text>
            <Button leftSection={<IconPlus size={16} />} onClick={() => openBalanceModal()}>
              Novo Registro
            </Button>
          </Group>

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Mês/Ano</Table.Th>
                <Table.Th>Saldo Final</Table.Th>
                <Table.Th>Rendimento</Table.Th>
                <Table.Th>Observação</Table.Th>
                <Table.Th style={{ width: '100px' }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading ? (
                <Table.Tr>
                  <Table.Td colSpan={5} style={{ textAlign: 'center' }}>
                    Carregando...
                  </Table.Td>
                </Table.Tr>
              ) : balances.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>
                    <Text c="dimmed">Nenhum saldo registrado ainda</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                balances.map((balance) => (
                  <Table.Tr key={balance.id}>
                    <Table.Td>{balance.monthYear}</Table.Td>
                    <Table.Td>R$ {parseFloat(balance.finalBalance).toFixed(2)}</Table.Td>
                    <Table.Td>
                      <Badge color={parseFloat(balance.yield) > 0 ? 'green' : 'gray'}>
                        R$ {parseFloat(balance.yield).toFixed(2)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>{balance.observation || '-'}</Table.Td>
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => openBalanceModal(balance)}
                      >
                        <IconPencil size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Stack>
      </Modal>

      <Modal
        opened={modalOpened}
        onClose={closeBalanceModal}
        title={editingBalance ? 'Editar Saldo' : 'Novo Saldo'}
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Mês/Ano"
            placeholder="Ex: 2025-01"
            required
            value={monthYear}
            onChange={(e) => setMonthYear(e.target.value)}
            description="Formato: AAAA-MM"
          />

          <NumberInput
            label="Saldo Final"
            placeholder="Ex: 1500.00"
            required
            value={finalBalance}
            onChange={(value) => setFinalBalance(typeof value === 'number' ? value : '')}
            decimalScale={2}
            fixedDecimalScale
            prefix="R$ "
            thousandSeparator="."
            decimalSeparator=","
          />

          <Textarea
            label="Observação"
            placeholder="Anotações sobre este mês (opcional)"
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            rows={3}
          />

          <Text size="xs" c="dimmed">
            O rendimento será calculado automaticamente comparando com o saldo anterior
          </Text>

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={closeBalanceModal}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              Salvar
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
