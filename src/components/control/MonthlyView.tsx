'use client';

import { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  Group,
  Button,
  Select,
  Table,
  Text,
  Badge,
  ActionIcon,
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Tabs,
  Skeleton,
} from '@mantine/core';
import { IconPlus, IconEdit, IconCreditCard, IconArrowsExchange, IconTrash } from '@tabler/icons-react';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { InvoiceDetails } from './InvoiceDetails';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

dayjs.locale('pt-br');

interface Transaction {
  id: string;
  name: string;
  type: 'income' | 'expense';
  expectedAmount: string;
  actualAmount: string | null;
  paidDate: string | null;
  paymentMethod: string;
  bankAccountName?: string;
  cardName?: string;
  isPaid: boolean;
  isProvisioned: boolean; // Se veio de gasto provisionado
}

interface Transfer {
  id: string;
  fromBankAccountName: string;
  toBankAccountName: string;
  amount: string;
  transferDate: string;
  description: string | null;
}

interface CardInvoice {
  id: string;
  cardId: string;
  cardName: string;
  totalAmount: string;
  dueDate: string | null;
  isPaid: boolean;
  paidDate: string | null;
  transactionCount: number;
}

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
}

interface Card {
  id: string;
  name: string;
}

interface AccountBalance {
  accountId: string;
  accountName: string;
  bankName: string;
  initialBalance: number;
  income: number;
  expenses: number;
  transfersIn: number;
  transfersOut: number;
  invoicePayments: number;
  finalBalance: number;
}

interface MonthlyViewProps {
  controlId: string;
}

export function MonthlyView({ controlId }: MonthlyViewProps) {
  const [currentMonth, setCurrentMonth] = useState(dayjs().format('YYYY-MM'));
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [cardInvoices, setCardInvoices] = useState<CardInvoice[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [accountBalances, setAccountBalances] = useState<AccountBalance[]>([]);
  
  // Modais
  const [transactionModalOpened, setTransactionModalOpened] = useState(false);
  const [editTransactionModalOpened, setEditTransactionModalOpened] = useState(false);
  const [transferModalOpened, setTransferModalOpened] = useState(false);
  const [editTransferModalOpened, setEditTransferModalOpened] = useState(false);
  const [invoiceDetailsOpened, setInvoiceDetailsOpened] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<CardInvoice | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // Form data
  const [transactionForm, setTransactionForm] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    expectedAmount: '',
    paymentMethod: 'bank_account',
    bankAccountId: '',
    cardId: '',
    paidDate: null as Date | null,
  });

  const [editTransactionForm, setEditTransactionForm] = useState({
    name: '',
    expectedAmount: '',
    actualAmount: '',
    paidDate: null as Date | null,
  });

  const [transferForm, setTransferForm] = useState({
    fromBankAccountId: '',
    toBankAccountId: '',
    amount: '',
    transferDate: new Date(),
    description: '',
  });

  const [editTransferForm, setEditTransferForm] = useState({
    amount: '',
    transferDate: new Date(),
    description: '',
  });

  // Gerar lista de meses (12 anteriores + atual + 6 futuros = 19 meses)
  const months = Array.from({ length: 19 }, (_, i) => {
    const month = dayjs().subtract(12 - i, 'month');
    return {
      value: month.format('YYYY-MM'),
      label: month.format('MMMM [de] YYYY'),
    };
  });

  const loadTransactions = async () => {
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/monthly-transactions?month=${currentMonth}`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
    }
  };

  const loadTransfers = async () => {
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/transfers?month=${currentMonth}`);
      if (response.ok) {
        const data = await response.json();
        setTransfers(data);
      }
    } catch (error) {
      console.error('Erro ao carregar transferências:', error);
    }
  };

  const loadCardInvoices = async () => {
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/card-invoices?month=${currentMonth}`);
      if (response.ok) {
        const data = await response.json();
        setCardInvoices(data);
      }
    } catch (error) {
      console.error('Erro ao carregar faturas:', error);
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

  const loadCards = async () => {
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/cards`);
      if (response.ok) {
        const data = await response.json();
        setCards(data);
      }
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
    }
  };

  const loadAccountBalances = async () => {
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/account-balances?month=${currentMonth}`);
      if (response.ok) {
        const data = await response.json();
        setAccountBalances(data);
      }
    } catch (error) {
      console.error('Erro ao carregar saldos:', error);
    }
  };

  const loadAllData = async () => {
    setPageLoading(true);
    try {
      await Promise.all([
        loadTransactions(),
        loadTransfers(),
        loadCardInvoices(),
        loadBankAccounts(),
        loadCards(),
        loadAccountBalances(),
      ]);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, controlId]);

  const handleTransactionSubmit = async () => {
    if (!transactionForm.name || !transactionForm.expectedAmount) {
      notifications.show({
        title: 'Erro',
        message: 'Preencha nome e valor esperado',
        color: 'red',
      });
      return;
    }

    if (transactionForm.paymentMethod === 'bank_account' && !transactionForm.bankAccountId) {
      notifications.show({
        title: 'Erro',
        message: 'Selecione uma conta bancária',
        color: 'red',
      });
      return;
    }

    if (transactionForm.paymentMethod === 'credit_card' && !transactionForm.cardId) {
      notifications.show({
        title: 'Erro',
        message: 'Selecione um cartão',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/monthly-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transactionForm,
          monthYear: currentMonth,
          actualAmount: transactionForm.paidDate ? transactionForm.expectedAmount : null,
        }),
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Transação criada',
          color: 'green',
        });
        setTransactionModalOpened(false);
        setTransactionForm({
          name: '',
          type: 'expense',
          expectedAmount: '',
          paymentMethod: 'bank_account',
          bankAccountId: '',
          cardId: '',
          paidDate: null,
        });
        loadAllData();
      } else {
        throw new Error('Erro ao criar transação');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível criar a transação',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTransferSubmit = async () => {
    if (!transferForm.fromBankAccountId || !transferForm.toBankAccountId || !transferForm.amount) {
      notifications.show({
        title: 'Erro',
        message: 'Preencha todos os campos obrigatórios',
        color: 'red',
      });
      return;
    }

    if (transferForm.fromBankAccountId === transferForm.toBankAccountId) {
      notifications.show({
        title: 'Erro',
        message: 'Conta de origem e destino devem ser diferentes',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transferForm,
          monthYear: currentMonth,
          transferDate: dayjs(transferForm.transferDate).format('YYYY-MM-DD'),
        }),
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Transferência criada',
          color: 'green',
        });
        setTransferModalOpened(false);
        setTransferForm({
          fromBankAccountId: '',
          toBankAccountId: '',
          amount: '',
          transferDate: new Date(),
          description: '',
        });
        loadAllData();
      } else {
        throw new Error('Erro ao criar transferência');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível criar a transferência',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditTransaction = async () => {
    if (!selectedTransaction) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/financial-controls/${controlId}/monthly-transactions/${selectedTransaction.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editTransactionForm.name,
            expectedAmount: editTransactionForm.expectedAmount,
            actualAmount: editTransactionForm.actualAmount || null,
            paidDate: editTransactionForm.paidDate 
              ? dayjs(editTransactionForm.paidDate).format('YYYY-MM-DD')
              : null,
          }),
        }
      );

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Transação atualizada',
          color: 'green',
        });
        setEditTransactionModalOpened(false);
        setSelectedTransaction(null);
        loadAllData();
      } else {
        throw new Error('Erro ao atualizar transação');
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

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transação?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/financial-controls/${controlId}/monthly-transactions/${transactionId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Transação excluída',
          color: 'green',
        });
        loadAllData();
      } else {
        throw new Error('Erro ao excluir transação');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível excluir a transação',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setEditTransactionForm({
      name: transaction.name,
      expectedAmount: transaction.expectedAmount,
      actualAmount: transaction.actualAmount || '',
      paidDate: transaction.paidDate ? new Date(transaction.paidDate) : null,
    });
    setEditTransactionModalOpened(true);
  };

  const handleDeleteTransfer = async (transferId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta transferência?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/financial-controls/${controlId}/transfers/${transferId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Transferência excluída',
          color: 'green',
        });
        loadAllData();
      } else {
        throw new Error('Erro ao excluir transferência');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível excluir a transferência',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditTransferModal = (transfer: Transfer) => {
    setSelectedTransfer(transfer);
    setEditTransferForm({
      amount: transfer.amount,
      transferDate: new Date(transfer.transferDate),
      description: transfer.description || '',
    });
    setEditTransferModalOpened(true);
  };

  const handleEditTransfer = async () => {
    if (!selectedTransfer) return;

    if (!editTransferForm.amount) {
      notifications.show({
        title: 'Erro',
        message: 'Preencha o valor da transferência',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/financial-controls/${controlId}/transfers/${selectedTransfer.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: editTransferForm.amount,
            transferDate: dayjs(editTransferForm.transferDate).format('YYYY-MM-DD'),
            description: editTransferForm.description || null,
          }),
        }
      );

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Transferência atualizada!',
          color: 'green',
        });
        setEditTransferModalOpened(false);
        setSelectedTransfer(null);
        loadAllData();
      } else {
        throw new Error('Erro ao atualizar transferência');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível atualizar a transferência',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = transactions
    .filter((t) => t.type === 'income' && t.isPaid)
    .reduce((sum, t) => sum + parseFloat(t.actualAmount || '0'), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense' && t.isPaid)
    .reduce((sum, t) => sum + parseFloat(t.actualAmount || '0'), 0);

  const balance = totalIncome - totalExpense;

  // Valores previstos
  const expectedIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.expectedAmount || '0'), 0);

  const expectedExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.expectedAmount || '0'), 0);

  const expectedBalance = expectedIncome - expectedExpense;

  // Diferença (planejado vs realizado)
  const incomeDiff = totalIncome - expectedIncome;
  const expenseDiff = totalExpense - expectedExpense;
  const balanceDiff = balance - expectedBalance;

  const handleGenerateMonthly = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/generate-monthly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthYear: currentMonth }),
      });

      if (response.ok) {
        const data = await response.json();
        notifications.show({
          title: 'Sucesso',
          message: `${data.createdCount} transações geradas`,
          color: 'green',
        });
        loadAllData();
      } else {
        throw new Error('Erro ao gerar transações');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível gerar as transações mensais',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Extrato Mensal</Title>
          <Text c="dimmed" size="sm">
            Visualize todas as movimentações do mês
          </Text>
        </div>
        <Group>
          <Button
            variant="light"
            color="blue"
            onClick={handleGenerateMonthly}
            loading={loading}
          >
            Gerar Transações do Mês
          </Button>
          <Select
            value={currentMonth}
            onChange={(value) => value && setCurrentMonth(value)}
            data={months}
            style={{ width: 220 }}
          />
        </Group>
      </Group>

      {/* Resumo Financeiro */}
      <Paper shadow="xs" p="md" mb="xl">
        <Group justify="space-between" grow>
          {/* Receitas */}
          <div>
            <Text size="sm" c="dimmed" mb={4}>💰 Receitas</Text>
            <Group gap="xs" align="center">
              <div>
                <Text size="xs" c="dimmed">Previsto:</Text>
                <Text size="lg" fw={500} c="green">R$ {expectedIncome.toFixed(2)}</Text>
              </div>
              <Text size="xl" c="dimmed">→</Text>
              <div>
                <Text size="xs" c="dimmed">Realizado:</Text>
                <Text size="xl" fw={700} c="green">R$ {totalIncome.toFixed(2)}</Text>
              </div>
            </Group>
            {incomeDiff !== 0 && (
              <Text size="xs" c={incomeDiff > 0 ? 'teal' : 'orange'} mt={4}>
                {incomeDiff > 0 ? '+' : ''}{incomeDiff.toFixed(2)} que o previsto
              </Text>
            )}
          </div>

          {/* Despesas */}
          <div>
            <Text size="sm" c="dimmed" mb={4}>💸 Despesas</Text>
            <Group gap="xs" align="center">
              <div>
                <Text size="xs" c="dimmed">Previsto:</Text>
                <Text size="lg" fw={500} c="red">R$ {expectedExpense.toFixed(2)}</Text>
              </div>
              <Text size="xl" c="dimmed">→</Text>
              <div>
                <Text size="xs" c="dimmed">Realizado:</Text>
                <Text size="xl" fw={700} c="red">R$ {totalExpense.toFixed(2)}</Text>
              </div>
            </Group>
            {expenseDiff !== 0 && (
              <Text size="xs" c={expenseDiff < 0 ? 'teal' : 'orange'} mt={4}>
                {expenseDiff > 0 ? '+' : ''}{expenseDiff.toFixed(2)} que o previsto
              </Text>
            )}
          </div>

          {/* Saldo */}
          <div>
            <Text size="sm" c="dimmed" mb={4}>📊 Saldo</Text>
            <Group gap="xs" align="center">
              <div>
                <Text size="xs" c="dimmed">Previsto:</Text>
                <Text size="lg" fw={500} c={expectedBalance >= 0 ? 'blue' : 'red'}>
                  R$ {expectedBalance.toFixed(2)}
                </Text>
              </div>
              <Text size="xl" c="dimmed">→</Text>
              <div>
                <Text size="xs" c="dimmed">Realizado:</Text>
                <Text size="xl" fw={700} c={balance >= 0 ? 'blue' : 'red'}>
                  R$ {balance.toFixed(2)}
                </Text>
              </div>
            </Group>
            {balanceDiff !== 0 && (
              <Text size="xs" c={balanceDiff > 0 ? 'teal' : 'orange'} mt={4}>
                {balanceDiff > 0 ? '+' : ''}{balanceDiff.toFixed(2)} que o previsto
              </Text>
            )}
          </div>
        </Group>
      </Paper>

      {/* Tabs para separar Transações, Transferências e Faturas */}
      <Tabs defaultValue="transactions">
        <Tabs.List mb="md">
          <Tabs.Tab value="transactions">Transações</Tabs.Tab>
          <Tabs.Tab value="transfers">Transferências</Tabs.Tab>
          <Tabs.Tab value="invoices" leftSection={<IconCreditCard size={16} />}>
            Faturas de Cartão
          </Tabs.Tab>
          <Tabs.Tab value="balances">Saldos das Contas</Tabs.Tab>
        </Tabs.List>

        {/* ABA: Transações */}
        <Tabs.Panel value="transactions">
          <Paper shadow="xs" p="md">
            <Group justify="space-between" mb="md">
              <Text fw={500}>Lançamentos</Text>
              <Button
                leftSection={<IconPlus size={16} />}
                size="sm"
                onClick={() => setTransactionModalOpened(true)}
              >
                Novo Lançamento
              </Button>
            </Group>

            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Data</Table.Th>
                  <Table.Th>Descrição</Table.Th>
                  <Table.Th>Tipo</Table.Th>
                  <Table.Th>Forma de Pagamento</Table.Th>
                  <Table.Th>Valor</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th style={{ width: 100 }}>Ações</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pageLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <Table.Tr key={`skeleton-transaction-${i}`}>
                      <Table.Td><Skeleton height={20} width="60%" /></Table.Td>
                      <Table.Td><Skeleton height={20} width="80%" /></Table.Td>
                      <Table.Td><Skeleton height={20} width="50%" /></Table.Td>
                      <Table.Td><Skeleton height={20} width="70%" /></Table.Td>
                      <Table.Td><Skeleton height={20} width="50%" /></Table.Td>
                      <Table.Td><Skeleton height={20} width="40%" /></Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Skeleton height={28} circle />
                          <Skeleton height={28} circle />
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : transactions.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>
                      <Text c="dimmed">Nenhuma transação neste mês</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  transactions
                    .sort((a, b) => {
                      const dateA = a.paidDate || '9999-12-31';
                      const dateB = b.paidDate || '9999-12-31';
                      return dateA.localeCompare(dateB);
                    })
                    .map((transaction) => (
                      <Table.Tr 
                        key={transaction.id}
                        onDoubleClick={() => {
                          // Se for transação de cartão, abrir a fatura
                          if (transaction.paymentMethod === 'credit_card' && transaction.cardName) {
                            const invoice = cardInvoices.find(inv => inv.cardName === transaction.cardName);
                            if (invoice) {
                              setSelectedInvoice(invoice);
                              setInvoiceDetailsOpened(true);
                            }
                          } else {
                            openEditModal(transaction);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <Table.Td>
                          {transaction.paidDate
                            ? dayjs(transaction.paidDate).format('DD/MM/YYYY')
                            : '-'}
                        </Table.Td>
                        <Table.Td>
                          {/* Se for cartão, mostrar nome do cartão ao invés do nome da conta */}
                          {transaction.paymentMethod === 'credit_card' && transaction.cardName ? (
                            <Group gap="xs">
                              <IconCreditCard size={16} />
                              <Text>{transaction.cardName}</Text>
                            </Group>
                          ) : (
                            transaction.name
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Badge color={transaction.type === 'income' ? 'green' : 'red'} variant="light">
                            {transaction.type === 'income' ? 'Receita' : 'Despesa'}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {transaction.paymentMethod === 'credit_card' && transaction.cardName}
                          {transaction.paymentMethod === 'bank_account' && transaction.bankAccountName}
                          {transaction.paymentMethod === 'cash' && 'Dinheiro'}
                        </Table.Td>
                        <Table.Td>
                          <Text fw={500} c={transaction.type === 'income' ? 'green' : 'red'}>
                            R$ {parseFloat(transaction.actualAmount || transaction.expectedAmount).toFixed(2)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          {transaction.isPaid ? (
                            <Badge color="green" variant="light">Pago</Badge>
                          ) : (
                            <Badge color="orange" variant="light">
                              {transaction.isProvisioned ? 'Provisionado' : 'Pendente'}
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <ActionIcon 
                              variant="subtle" 
                              color="blue"
                              onClick={() => openEditModal(transaction)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                            <ActionIcon 
                              variant="subtle" 
                              color="red"
                              onClick={() => handleDeleteTransaction(transaction.id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        {/* ABA: Transferências */}
        <Tabs.Panel value="transfers">
          <Paper shadow="xs" p="md">
            <Group justify="space-between" mb="md">
              <Text fw={500}>Transferências entre Contas</Text>
              <Button
                leftSection={<IconArrowsExchange size={16} />}
                size="sm"
                onClick={() => setTransferModalOpened(true)}
              >
                Nova Transferência
              </Button>
            </Group>

            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Data</Table.Th>
                  <Table.Th>De</Table.Th>
                  <Table.Th>Para</Table.Th>
                  <Table.Th>Valor</Table.Th>
                  <Table.Th>Descrição</Table.Th>
                  <Table.Th style={{ width: 100 }}>Ações</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pageLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <Table.Tr key={`skeleton-transfer-${i}`}>
                      <Table.Td><Skeleton height={20} width="60%" /></Table.Td>
                      <Table.Td><Skeleton height={20} width="70%" /></Table.Td>
                      <Table.Td><Skeleton height={20} width="70%" /></Table.Td>
                      <Table.Td><Skeleton height={20} width="50%" /></Table.Td>
                      <Table.Td><Skeleton height={20} width="80%" /></Table.Td>
                      <Table.Td>
                        <Group gap={8}>
                          <Skeleton height={28} circle />
                          <Skeleton height={28} circle />
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : transfers.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6} style={{ textAlign: 'center', padding: 32 }}>
                      <Text c="dimmed">Nenhuma transferência neste mês</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  transfers
                    .sort((a, b) => a.transferDate.localeCompare(b.transferDate))
                    .map((transfer) => (
                      <Table.Tr 
                        key={transfer.id}
                        onDoubleClick={() => openEditTransferModal(transfer)}
                        style={{ cursor: 'pointer' }}
                      >
                        <Table.Td>{dayjs(transfer.transferDate).format('DD/MM/YYYY')}</Table.Td>
                        <Table.Td>
                          <Badge color="blue" variant="light">{transfer.fromBankAccountName}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="green" variant="light">{transfer.toBankAccountName}</Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={500}>R$ {parseFloat(transfer.amount).toFixed(2)}</Text>
                        </Table.Td>
                        <Table.Td>{transfer.description || '-'}</Table.Td>
                        <Table.Td>
                          <Group gap={8}>
                            <ActionIcon 
                              variant="subtle" 
                              color="blue"
                              onClick={() => openEditTransferModal(transfer)}
                            >
                              <IconEdit size={16} />
                            </ActionIcon>
                            <ActionIcon 
                              variant="subtle" 
                              color="red"
                              onClick={() => handleDeleteTransfer(transfer.id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        {/* ABA: Faturas de Cartão */}
        <Tabs.Panel value="invoices">
          <Paper shadow="xs" p="md">
            <Group justify="space-between" mb="md">
              <div>
                <Text fw={500}>Faturas de Cartão de Crédito</Text>
                <Text size="xs" c="dimmed">Clique duplo para ver os detalhes e confirmar valores</Text>
              </div>
            </Group>

            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Cartão</Table.Th>
                  <Table.Th>Vencimento</Table.Th>
                  <Table.Th>Valor Total</Table.Th>
                  <Table.Th>Transações</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th style={{ width: 100 }}>Ações</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {pageLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <Table.Tr key={`skeleton-invoice-${i}`}>
                      <Table.Td><Skeleton height={20} width="70%" /></Table.Td>
                      <Table.Td><Skeleton height={20} width="60%" /></Table.Td>
                      <Table.Td><Skeleton height={20} width="50%" /></Table.Td>
                      <Table.Td><Skeleton height={20} width="40%" /></Table.Td>
                      <Table.Td><Skeleton height={20} width="50%" /></Table.Td>
                      <Table.Td><Skeleton height={28} width="80%" /></Table.Td>
                    </Table.Tr>
                  ))
                ) : cardInvoices.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6} style={{ textAlign: 'center', padding: 32 }}>
                      <Text c="dimmed">Nenhuma fatura neste mês</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  cardInvoices.map((invoice) => (
                    <Table.Tr 
                      key={invoice.id}
                      onDoubleClick={() => {
                        setSelectedInvoice(invoice);
                        setInvoiceDetailsOpened(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <Table.Td>
                        <Group gap="xs">
                          <IconCreditCard size={16} />
                          <Text>{invoice.cardName}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        {invoice.dueDate ? dayjs(invoice.dueDate).format('DD/MM/YYYY') : '-'}
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500} c="red">R$ {parseFloat(invoice.totalAmount).toFixed(2)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">{invoice.transactionCount} lançamentos</Badge>
                      </Table.Td>
                      <Table.Td>
                        {invoice.isPaid ? (
                          <Badge color="green" variant="light">
                            Paga {invoice.paidDate && `em ${dayjs(invoice.paidDate).format('DD/MM')}`}
                          </Badge>
                        ) : (
                          <Badge color="orange" variant="light">Em Aberto</Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Button 
                          size="xs" 
                          variant="light"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(invoice);
                            setInvoiceDetailsOpened(true);
                          }}
                        >
                          Ver Detalhes
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Tabs.Panel>

        {/* ABA: Saldos das Contas */}
        <Tabs.Panel value="balances">
          <Paper shadow="xs" p="md">
            <Text fw={500} mb="md">Saldos das Contas Bancárias - {dayjs(currentMonth).format('MMMM/YYYY')}</Text>

            {pageLoading ? (
              <Stack gap="md">
                {Array(2).fill(0).map((_, i) => (
                  <Paper key={`skeleton-balance-${i}`} withBorder p="md">
                    <Group justify="space-between" mb="md">
                      <div>
                        <Skeleton height={24} width={200} mb={8} />
                        <Skeleton height={16} width={150} />
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Skeleton height={14} width={80} mb={4} />
                        <Skeleton height={28} width={120} />
                      </div>
                    </Group>
                    <Stack gap="xs">
                      <Skeleton height={20} width="100%" />
                      <Skeleton height={20} width="100%" />
                      <Skeleton height={20} width="100%" />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            ) : accountBalances.length === 0 ? (
              <Text c="dimmed" ta="center" py={32}>
                Nenhuma conta com controle de saldo ativado. Ative o controle nas configurações das contas.
              </Text>
            ) : (
              <Stack gap="md">
                {accountBalances.map((balance) => (
                  <Paper key={balance.accountId} withBorder p="md">
                    <Group justify="space-between" mb="md">
                      <div>
                        <Text fw={600} size="lg">{balance.accountName}</Text>
                        <Text size="sm" c="dimmed">{balance.bankName}</Text>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Text size="xs" c="dimmed">Saldo Final</Text>
                        <Text fw={700} size="xl" c={balance.finalBalance >= 0 ? 'green' : 'red'}>
                          R$ {balance.finalBalance.toFixed(2)}
                        </Text>
                      </div>
                    </Group>

                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">Saldo Inicial:</Text>
                        <Text size="sm" fw={500}>R$ {balance.initialBalance.toFixed(2)}</Text>
                      </Group>

                      {balance.income > 0 && (
                        <Group justify="space-between">
                          <Text size="sm" c="green">+ Receitas:</Text>
                          <Text size="sm" fw={500} c="green">R$ {balance.income.toFixed(2)}</Text>
                        </Group>
                      )}

                      {balance.expenses > 0 && (
                        <Group justify="space-between">
                          <Text size="sm" c="red">- Despesas:</Text>
                          <Text size="sm" fw={500} c="red">R$ {balance.expenses.toFixed(2)}</Text>
                        </Group>
                      )}

                      {balance.transfersIn > 0 && (
                        <Group justify="space-between">
                          <Text size="sm" c="teal">+ Transferências Recebidas:</Text>
                          <Text size="sm" fw={500} c="teal">R$ {balance.transfersIn.toFixed(2)}</Text>
                        </Group>
                      )}

                      {balance.transfersOut > 0 && (
                        <Group justify="space-between">
                          <Text size="sm" c="orange">- Transferências Enviadas:</Text>
                          <Text size="sm" fw={500} c="orange">R$ {balance.transfersOut.toFixed(2)}</Text>
                        </Group>
                      )}

                      {balance.invoicePayments > 0 && (
                        <Group justify="space-between">
                          <Text size="sm" c="red">- Pagamentos de Faturas:</Text>
                          <Text size="sm" fw={500} c="red">R$ {balance.invoicePayments.toFixed(2)}</Text>
                        </Group>
                      )}
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Tabs.Panel>
      </Tabs>

      {/* Modal: Nova Transação */}
      <Modal
        opened={transactionModalOpened}
        onClose={() => setTransactionModalOpened(false)}
        title="Novo Lançamento"
        size="lg"
      >
        <Stack>
          <TextInput
            label="Descrição"
            placeholder="Ex: Conta de luz"
            value={transactionForm.name}
            onChange={(e) => setTransactionForm({ ...transactionForm, name: e.target.value })}
            required
          />

          <Select
            label="Tipo"
            value={transactionForm.type}
            onChange={(value) => setTransactionForm({ ...transactionForm, type: value as 'income' | 'expense' })}
            data={[
              { value: 'expense', label: 'Despesa' },
              { value: 'income', label: 'Receita' },
            ]}
            required
          />

          <NumberInput
            label="Valor"
            placeholder="0.00"
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator="."
            decimalSeparator=","
            value={transactionForm.expectedAmount}
            onChange={(value) => setTransactionForm({ ...transactionForm, expectedAmount: String(value) })}
            required
          />

          <Select
            label="Forma de Pagamento"
            value={transactionForm.paymentMethod}
            onChange={(value) => setTransactionForm({ ...transactionForm, paymentMethod: value || 'bank_account' })}
            data={[
              { value: 'bank_account', label: 'Conta Bancária' },
              { value: 'credit_card', label: 'Cartão de Crédito' },
              { value: 'cash', label: 'Dinheiro' },
            ]}
            required
          />

          {transactionForm.paymentMethod === 'bank_account' && (
            <Select
              label="Conta Bancária"
              placeholder="Selecione uma conta"
              value={transactionForm.bankAccountId}
              onChange={(value) => setTransactionForm({ ...transactionForm, bankAccountId: value || '' })}
              data={bankAccounts.map((acc) => ({
                value: acc.id,
                label: `${acc.name} - ${acc.bankName}`,
              }))}
              required
            />
          )}

          {transactionForm.paymentMethod === 'credit_card' && (
            <Select
              label="Cartão de Crédito"
              placeholder="Selecione um cartão"
              value={transactionForm.cardId}
              onChange={(value) => setTransactionForm({ ...transactionForm, cardId: value || '' })}
              data={cards.map((card) => ({
                value: card.id,
                label: card.name,
              }))}
              required
            />
          )}

          <DateInput
            label="Data de Pagamento (opcional)"
            placeholder="Deixe em branco se ainda não foi pago"
            value={transactionForm.paidDate}
            onChange={(value) => setTransactionForm({ ...transactionForm, paidDate: value })}
            valueFormat="DD/MM/YYYY"
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setTransactionModalOpened(false)}>
              Cancelar
            </Button>
            <Button onClick={handleTransactionSubmit} loading={loading}>
              Salvar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal: Nova Transferência */}
      <Modal
        opened={transferModalOpened}
        onClose={() => setTransferModalOpened(false)}
        title="Nova Transferência"
        size="lg"
      >
        <Stack>
          <Select
            label="Conta de Origem"
            placeholder="Selecione a conta de origem"
            value={transferForm.fromBankAccountId}
            onChange={(value) => setTransferForm({ ...transferForm, fromBankAccountId: value || '' })}
            data={bankAccounts.map((acc) => ({
              value: acc.id,
              label: `${acc.name} - ${acc.bankName}`,
            }))}
            required
          />

          <Select
            label="Conta de Destino"
            placeholder="Selecione a conta de destino"
            value={transferForm.toBankAccountId}
            onChange={(value) => setTransferForm({ ...transferForm, toBankAccountId: value || '' })}
            data={bankAccounts.map((acc) => ({
              value: acc.id,
              label: `${acc.name} - ${acc.bankName}`,
            }))}
            required
          />

          <NumberInput
            label="Valor"
            placeholder="0.00"
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator="."
            decimalSeparator=","
            value={transferForm.amount}
            onChange={(value) => setTransferForm({ ...transferForm, amount: String(value) })}
            required
          />

          <DateInput
            label="Data da Transferência"
            value={transferForm.transferDate}
            onChange={(value) => setTransferForm({ ...transferForm, transferDate: value || new Date() })}
            valueFormat="DD/MM/YYYY"
            required
          />

          <TextInput
            label="Descrição (opcional)"
            placeholder="Ex: Transferência para conta da esposa"
            value={transferForm.description}
            onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setTransferModalOpened(false)}>
              Cancelar
            </Button>
            <Button onClick={handleTransferSubmit} loading={loading}>
              Salvar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal: Editar Transferência */}
      <Modal
        opened={editTransferModalOpened}
        onClose={() => {
          setEditTransferModalOpened(false);
          setSelectedTransfer(null);
        }}
        title="Editar Transferência"
        size="lg"
      >
        <Stack>
          <NumberInput
            label="Valor"
            placeholder="0.00"
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator="."
            decimalSeparator=","
            value={editTransferForm.amount}
            onChange={(value) => setEditTransferForm({ ...editTransferForm, amount: String(value) })}
            required
          />

          <DateInput
            label="Data da Transferência"
            value={editTransferForm.transferDate}
            onChange={(value) => setEditTransferForm({ ...editTransferForm, transferDate: value || new Date() })}
            valueFormat="DD/MM/YYYY"
            required
          />

          <TextInput
            label="Descrição (opcional)"
            placeholder="Ex: Transferência para conta da esposa"
            value={editTransferForm.description}
            onChange={(e) => setEditTransferForm({ ...editTransferForm, description: e.target.value })}
          />

          <Group justify="flex-end" mt="md">
            <Button 
              variant="default" 
              onClick={() => {
                setEditTransferModalOpened(false);
                setSelectedTransfer(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditTransfer} loading={loading}>
              Salvar Alterações
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal: Editar Transação */}
      <Modal
        opened={editTransactionModalOpened}
        onClose={() => {
          setEditTransactionModalOpened(false);
          setSelectedTransaction(null);
        }}
        title="Editar Transação"
        size="lg"
      >
        <Stack>
          <TextInput
            label="Descrição"
            placeholder="Ex: Conta de luz"
            value={editTransactionForm.name}
            onChange={(e) => setEditTransactionForm({ ...editTransactionForm, name: e.target.value })}
            required
          />

          <NumberInput
            label="Valor Esperado"
            placeholder="0.00"
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator="."
            decimalSeparator=","
            value={editTransactionForm.expectedAmount}
            onChange={(value) => setEditTransactionForm({ ...editTransactionForm, expectedAmount: String(value) })}
            required
          />

          <NumberInput
            label="Valor Real (opcional)"
            placeholder="0.00"
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator="."
            decimalSeparator=","
            value={editTransactionForm.actualAmount}
            onChange={(value) => setEditTransactionForm({ ...editTransactionForm, actualAmount: String(value) })}
          />

          <DateInput
            label="Data de Pagamento"
            placeholder="Deixe em branco se ainda não foi pago"
            value={editTransactionForm.paidDate}
            onChange={(value) => setEditTransactionForm({ ...editTransactionForm, paidDate: value })}
            valueFormat="DD/MM/YYYY"
          />

          <Group justify="flex-end" mt="md">
            <Button 
              variant="default" 
              onClick={() => {
                setEditTransactionModalOpened(false);
                setSelectedTransaction(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleEditTransaction} loading={loading}>
              Salvar Alterações
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal: Detalhes da Fatura */}
      {selectedInvoice && (
        <InvoiceDetails
          opened={invoiceDetailsOpened}
          onClose={() => {
            setInvoiceDetailsOpened(false);
            setSelectedInvoice(null);
          }}
          invoiceId={selectedInvoice.id}
          cardName={selectedInvoice.cardName}
          totalAmount={selectedInvoice.totalAmount}
          dueDate={selectedInvoice.dueDate}
          isPaid={selectedInvoice.isPaid}
          paidDate={selectedInvoice.paidDate}
          controlId={controlId}
          onUpdate={() => {
            loadAllData();
          }}
        />
      )}
    </div>
  );
}
