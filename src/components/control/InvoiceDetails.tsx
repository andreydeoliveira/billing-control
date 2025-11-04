'use client';

import { useState, useEffect } from 'react';
import {
  Modal,
  Title,
  Text,
  Table,
  Badge,
  Group,
  Button,
  Stack,
  Select,
  ActionIcon,
  NumberInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconCreditCard, IconEdit } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';

interface Transaction {
  id: string;
  name: string;
  type: 'income' | 'expense';
  expectedAmount: string;
  actualAmount: string | null;
  paidDate: string | null;
  installmentNumber: number | null;
  totalInstallments: number | null;
}

interface InvoiceDetailsProps {
  opened: boolean;
  onClose: () => void;
  invoiceId: string;
  cardName: string;
  totalAmount: string;
  dueDate: string | null;
  isPaid: boolean;
  paidDate: string | null;
  controlId: string;
  onUpdate: () => void;
}

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
}

export function InvoiceDetails({
  opened,
  onClose,
  invoiceId,
  cardName,
  totalAmount,
  dueDate,
  isPaid,
  paidDate,
  controlId,
  onUpdate,
}: InvoiceDetailsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    actualAmount: '',
    paidDate: null as Date | null,
  });
  const [paymentForm, setPaymentForm] = useState({
    bankAccountId: '',
    paidDate: new Date(),
  });

  const loadTransactions = async () => {
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/card-invoices/${invoiceId}/transactions`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
    }
  };

  const loadBankAccounts = async () => {
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/bank-accounts`);
      if (response.ok) {
        const data = await response.json();
        setBankAccounts(data);
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    }
  };

  useEffect(() => {
    if (opened) {
      loadTransactions();
      loadBankAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, invoiceId]);

  const handlePayInvoice = async () => {
    if (!paymentForm.bankAccountId) {
      notifications.show({
        title: 'Erro',
        message: 'Selecione a conta bancária que pagou a fatura',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/card-invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankAccountId: paymentForm.bankAccountId,
          paidDate: dayjs(paymentForm.paidDate).format('YYYY-MM-DD'),
        }),
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Fatura marcada como paga',
          color: 'green',
        });
        onUpdate();
        onClose();
      } else {
        throw new Error('Erro ao pagar fatura');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível marcar a fatura como paga',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setEditForm({
      actualAmount: transaction.actualAmount || transaction.expectedAmount,
      paidDate: transaction.paidDate ? new Date(transaction.paidDate) : null,
    });
    setEditModalOpened(true);
  };

  const handleUpdateTransaction = async () => {
    if (!selectedTransaction) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/financial-controls/${controlId}/monthly-transactions/${selectedTransaction.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actualAmount: editForm.actualAmount,
            paidDate: editForm.paidDate ? dayjs(editForm.paidDate).format('YYYY-MM-DD') : null,
          }),
        }
      );

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Transação atualizada',
          color: 'green',
        });
        setEditModalOpened(false);
        setSelectedTransaction(null);
        loadTransactions();
        onUpdate(); // Atualizar total da fatura
      } else {
        throw new Error('Erro ao atualizar');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível atualizar a transação',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <IconCreditCard size={24} />
          <div>
            <Title order={3}>{cardName}</Title>
            <Text size="sm" c="dimmed">Detalhes da Fatura</Text>
          </div>
        </Group>
      }
      size="xl"
    >
      <Stack>
        {/* Informações da Fatura */}
        <Group justify="space-between">
          <div>
            <Text size="sm" c="dimmed">Vencimento</Text>
            <Text fw={500}>
              {dueDate ? dayjs(dueDate).format('DD/MM/YYYY') : 'Não definido'}
            </Text>
          </div>
          <div>
            <Text size="sm" c="dimmed">Valor Total</Text>
            <Text size="xl" fw={700} c="red">
              R$ {parseFloat(totalAmount).toFixed(2)}
            </Text>
          </div>
          <div>
            <Text size="sm" c="dimmed">Status</Text>
            {isPaid ? (
              <Badge color="green" size="lg">
                Paga {paidDate && `em ${dayjs(paidDate).format('DD/MM')}`}
              </Badge>
            ) : (
              <Badge color="orange" size="lg">Em Aberto</Badge>
            )}
          </div>
        </Group>

        {/* Tabela de Transações */}
        <div>
          <Text fw={500} mb="md">Lançamentos no Cartão</Text>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Descrição</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Parcela</Table.Th>
                <Table.Th>Valor</Table.Th>
                <Table.Th style={{ width: 80 }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {transactions.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>
                    <Text c="dimmed">Nenhuma transação nesta fatura</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                transactions.map((transaction) => (
                  <Table.Tr key={transaction.id}>
                    <Table.Td>{transaction.name}</Table.Td>
                    <Table.Td>
                      <Badge color={transaction.type === 'income' ? 'green' : 'red'} variant="light">
                        {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      {transaction.totalInstallments ? (
                        <Badge variant="light">
                          {transaction.installmentNumber}/{transaction.totalInstallments}x
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500} c="red">
                        R$ {parseFloat(transaction.actualAmount || transaction.expectedAmount).toFixed(2)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => openEditModal(transaction)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </div>

        {/* Pagamento da Fatura */}
        {!isPaid && (
          <div>
            <Text fw={500} mb="md">Pagar Fatura</Text>
            <Stack>
              <Select
                label="Conta Bancária"
                placeholder="Selecione a conta que pagou"
                value={paymentForm.bankAccountId}
                onChange={(value) => setPaymentForm({ ...paymentForm, bankAccountId: value || '' })}
                data={bankAccounts.map((acc) => ({
                  value: acc.id,
                  label: `${acc.name} - ${acc.bankName}`,
                }))}
                required
              />

              <DateInput
                label="Data do Pagamento"
                value={paymentForm.paidDate}
                onChange={(value) => setPaymentForm({ ...paymentForm, paidDate: value || new Date() })}
                valueFormat="DD/MM/YYYY"
                required
              />

              <Button onClick={handlePayInvoice} loading={loading} fullWidth>
                Confirmar Pagamento
              </Button>
            </Stack>
          </div>
        )}
      </Stack>

      {/* Modal de Edição de Transação */}
      <Modal
        opened={editModalOpened}
        onClose={() => {
          setEditModalOpened(false);
          setSelectedTransaction(null);
        }}
        title="Editar Transação"
      >
        <Stack>
          {selectedTransaction && (
            <>
              <Text size="sm" c="dimmed">
                Editando: <strong>{selectedTransaction.name}</strong>
              </Text>
              
              <NumberInput
                label="Valor Real"
                value={editForm.actualAmount}
                onChange={(value) => setEditForm({ ...editForm, actualAmount: value?.toString() || '' })}
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale
                required
              />

              <DateInput
                label="Data de Pagamento"
                value={editForm.paidDate}
                onChange={(value) => setEditForm({ ...editForm, paidDate: value })}
                valueFormat="DD/MM/YYYY"
                clearable
              />

              <Group justify="space-between">
                <Button variant="default" onClick={() => setEditModalOpened(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdateTransaction} loading={loading}>
                  Salvar
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Modal>
  );
}
