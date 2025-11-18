'use client';

import { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  Text,
  Button,
  Table,
  Badge,
  ActionIcon,
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Select,
  Group,
  Switch,
  Skeleton,
  Textarea,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { parseBrazilianDate } from '@/lib/date-parser';

interface ProvisionedTransaction {
  id: string;
  type: string;
  expectedAmount: string;
  bankAccountId: string | null;
  cardId: string | null;
  bankAccountName?: string;
  cardName?: string;
  isRecurring: boolean;
  recurrenceType?: string | null;
  installments: number | null;
  currentInstallment: number;
  accountId: string;
  accountName?: string;
  observation?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
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

interface Account {
  id: string;
  name: string;
  type: 'expense' | 'income';
  color: string | null;
}

interface ProvisionedTransactionsProps {
  controlId: string;
}

export function ProvisionedTransactions({ controlId }: ProvisionedTransactionsProps) {
  const [transactions, setTransactions] = useState<ProvisionedTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<ProvisionedTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [modalOpened, setModalOpened] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [quickAccountModalOpened, setQuickAccountModalOpened] = useState(false);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [deleteInfo, setDeleteInfo] = useState<{
    hasRelatedTransactions: boolean;
    totalTransactions: number;
    paidTransactions: number;
    unpaidTransactions: number;
  } | null>(null);
  const [deleteStrategy, setDeleteStrategy] = useState<'all' | 'unpaid' | 'period'>('unpaid');
  const [deletePeriod, setDeletePeriod] = useState({
    startMonth: '',
    endMonth: '',
  });
  const [generateFutureModalOpened, setGenerateFutureModalOpened] = useState(false);
  const [targetYear, setTargetYear] = useState<string>('2027');
  const [selectedTransaction, setSelectedTransaction] = useState<ProvisionedTransaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [formData, setFormData] = useState({
    accountId: '',
    observation: '',
    expectedAmount: '',
    paymentSource: 'none', // 'none', 'bank_account' ou 'card'
    bankAccountId: '',
    cardId: '',
    isRecurring: true,
    recurrenceType: 'monthly', // 'monthly' ou 'yearly'
    installments: '',
    startDate: new Date() as Date | null,
    endDate: null as Date | null,
  });
  const [editFormData, setEditFormData] = useState({
    accountId: '',
    observation: '',
    expectedAmount: '',
    paymentSource: 'none', // 'none', 'bank_account' ou 'card'
    bankAccountId: '',
    cardId: '',
    isRecurring: true,
    recurrenceType: 'monthly',
    installments: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
  });
  const [quickAccountData, setQuickAccountData] = useState({
    name: '',
    type: 'expense' as 'expense' | 'income',
    classificationId: null as string | null,
    description: '',
  });
  const [classifications, setClassifications] = useState<Array<{ id: string; name: string }>>([]);
  const [newClassificationModalOpened, setNewClassificationModalOpened] = useState(false);
  const [newClassificationName, setNewClassificationName] = useState('');
  const [newClassificationDescription, setNewClassificationDescription] = useState('');

  const loadTransactions = async () => {
    setPageLoading(true);
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/provisioned-transactions`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
        setFilteredTransactions(data);
      }
    } catch (error) {
      console.error('Erro ao carregar provisionados:', error);
    } finally {
      setPageLoading(false);
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

  const loadAccounts = async () => {
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/accounts`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts);
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    }
  };

  const loadClassifications = async () => {
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/classifications`);
      if (response.ok) {
        const data = await response.json();
        setClassifications(data.filter((c: any) => c.isActive));
      }
    } catch (error) {
      console.error('Erro ao carregar classificações:', error);
    }
  };

  useEffect(() => {
    loadTransactions();
    loadBankAccounts();
    loadCards();
    loadAccounts();
    loadClassifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlId]);

  useEffect(() => {
    let filtered = transactions;

    // Filtro por status (ativo/inativo)
    if (statusFilter !== 'all') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter((transaction) => {
        if (statusFilter === 'active') {
          return !transaction.endDate || transaction.endDate >= today;
        } else {
          return transaction.endDate && transaction.endDate < today;
        }
      });
    }

    // Filtro por busca
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (transaction) =>
          (transaction.accountName && transaction.accountName.toLowerCase().includes(query)) ||
          (transaction.observation && transaction.observation.toLowerCase().includes(query)) ||
          (transaction.bankAccountName && transaction.bankAccountName.toLowerCase().includes(query)) ||
          (transaction.cardName && transaction.cardName.toLowerCase().includes(query))
      );
    }

    setFilteredTransactions(filtered);
  }, [searchQuery, transactions, statusFilter]);

  const handleCreateClassification = async () => {
    if (!newClassificationName.trim()) {
      notifications.show({
        title: 'Erro',
        message: 'Digite o nome da classificação',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/financial-controls/${controlId}/classifications`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newClassificationName,
            description: newClassificationDescription || null,
            isActive: true,
          }),
        }
      );

      if (response.ok) {
        const newClassification = await response.json();
        notifications.show({
          title: 'Sucesso',
          message: `Classificação "${newClassificationName}" criada`,
          color: 'green',
        });
        setNewClassificationModalOpened(false);
        setNewClassificationName('');
        setNewClassificationDescription('');
        await loadClassifications();
        setQuickAccountData({ ...quickAccountData, classificationId: newClassification.id });
      } else {
        throw new Error('Erro ao criar classificação');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível criar a classificação',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAccountCreate = async () => {
    if (!quickAccountData.name) {
      notifications.show({
        title: 'Erro',
        message: 'Nome da conta é obrigatório',
        color: 'red',
      });
      return;
    }

    try {
      const response = await fetch(`/api/financial-controls/${controlId}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: quickAccountData.name,
          type: quickAccountData.type,
          classificationId: quickAccountData.classificationId,
          isActive: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Conta criada com sucesso',
          color: 'green',
        });
        
        // Recarregar contas
        await loadAccounts();
        
        // Selecionar automaticamente a conta criada
        setFormData({ ...formData, accountId: data.account.id });
        
        // Fechar modal e limpar
        setQuickAccountModalOpened(false);
        setQuickAccountData({ name: '', type: 'expense', classificationId: null, description: '' });
      } else {
        notifications.show({
          title: 'Erro',
          message: data.error || 'Erro ao criar conta',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      notifications.show({
        title: 'Erro',
        message: 'Erro ao criar conta',
        color: 'red',
      });
    }
  };

  const handleSubmit = async () => {
    if (!formData.accountId || !formData.expectedAmount) {
      notifications.show({
        title: 'Erro',
        message: 'Selecione uma conta e informe o valor esperado',
        color: 'red',
      });
      return;
    }

    if (formData.paymentSource === 'bank_account' && !formData.bankAccountId) {
      notifications.show({
        title: 'Erro',
        message: 'Selecione uma conta bancária',
        color: 'red',
      });
      return;
    }

    if (formData.paymentSource === 'card' && !formData.cardId) {
      notifications.show({
        title: 'Erro',
        message: 'Selecione um cartão',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/provisioned-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: formData.accountId,
          observation: formData.observation || null,
          expectedAmount: formData.expectedAmount,
          bankAccountId: formData.paymentSource === 'bank_account' ? formData.bankAccountId : null,
          cardId: formData.paymentSource === 'card' ? formData.cardId : null,
          isRecurring: formData.isRecurring,
          recurrenceType: formData.isRecurring ? formData.recurrenceType : null,
          installments: formData.installments ? parseInt(formData.installments) : null,
          startDate: formData.startDate ? formData.startDate.toISOString().split('T')[0] : null,
          endDate: formData.endDate ? formData.endDate.toISOString().split('T')[0] : null,
        }),
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Gasto provisionado criado!',
          color: 'green',
        });
        setModalOpened(false);
        setFormData({
          accountId: '',
          observation: '',
          expectedAmount: '',
          paymentSource: 'bank_account',
          bankAccountId: '',
          cardId: '',
          isRecurring: true,
          recurrenceType: 'monthly',
          installments: '',
          startDate: null,
          endDate: null,
        });
        loadTransactions();
      } else {
        throw new Error('Erro ao criar provisionado');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível criar o gasto provisionado',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    // Primeiro, verificar se tem transações vinculadas
    setPageLoading(true);
    try {
      const response = await fetch(
        `/api/financial-controls/${controlId}/provisioned-transactions/${id}?strategy=check`
      );

      if (response.ok) {
        const data = await response.json();
        
        if (data.hasRelatedTransactions) {
          // Tem transações vinculadas, abrir modal de opções
          setTransactionToDelete(id);
          setDeleteInfo(data);
          setDeleteStrategy('unpaid'); // padrão: apenas não pagas
          setDeleteModalOpened(true);
        } else {
          // Não tem transações vinculadas, deletar direto
          await confirmDelete(id, null);
        }
      } else {
        throw new Error('Erro ao verificar transações');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível verificar as transações vinculadas',
        color: 'red',
      });
    } finally {
      setPageLoading(false);
    }
  };

  const confirmDelete = async (id: string, strategy: 'all' | 'unpaid' | 'period' | null) => {
    setLoading(true);
    try {
      let url = `/api/financial-controls/${controlId}/provisioned-transactions/${id}`;
      
      if (strategy) {
        url += `?strategy=${strategy}`;
        if (strategy === 'period') {
          url += `&startMonth=${deletePeriod.startMonth}&endMonth=${deletePeriod.endMonth}`;
        }
      }

      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Provisionado excluído',
          color: 'green',
        });
        setDeleteModalOpened(false);
        setTransactionToDelete(null);
        setDeleteInfo(null);
        loadTransactions();
      } else {
        throw new Error('Erro ao excluir');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível excluir o provisionado',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (transaction: ProvisionedTransaction) => {
    setSelectedTransaction(transaction);
    
    // Determinar paymentSource: none se não tem nem banco nem cartão, bank_account se tem banco, card se tem cartão
    let paymentSource: string = 'none';
    if (transaction.bankAccountId) {
      paymentSource = 'bank_account';
    } else if (transaction.cardId) {
      paymentSource = 'card';
    }
    
    setEditFormData({
      accountId: transaction.accountId,
      observation: transaction.observation || '',
      expectedAmount: transaction.expectedAmount,
      paymentSource,
      bankAccountId: transaction.bankAccountId || '',
      cardId: transaction.cardId || '',
      isRecurring: transaction.isRecurring,
      recurrenceType: transaction.recurrenceType || 'monthly',
      installments: transaction.installments ? String(transaction.installments) : '',
      startDate: transaction.startDate ? new Date(transaction.startDate) : null,
      endDate: transaction.endDate ? new Date(transaction.endDate) : null,
    });
    setEditModalOpened(true);
  };

  const handleEdit = async () => {
    if (!selectedTransaction) return;

    if (!editFormData.accountId || !editFormData.expectedAmount) {
      notifications.show({
        title: 'Erro',
        message: 'Selecione uma conta e informe o valor esperado',
        color: 'red',
      });
      return;
    }

    if (editFormData.paymentSource === 'bank_account' && !editFormData.bankAccountId) {
      notifications.show({
        title: 'Erro',
        message: 'Selecione uma conta bancária',
        color: 'red',
      });
      return;
    }

    if (editFormData.paymentSource === 'card' && !editFormData.cardId) {
      notifications.show({
        title: 'Erro',
        message: 'Selecione um cartão',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/financial-controls/${controlId}/provisioned-transactions/${selectedTransaction.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: editFormData.accountId,
            observation: editFormData.observation || null,
            expectedAmount: editFormData.expectedAmount,
            bankAccountId: editFormData.paymentSource === 'bank_account' ? editFormData.bankAccountId : null,
            cardId: editFormData.paymentSource === 'card' ? editFormData.cardId : null,
            paymentSource: editFormData.paymentSource, // Enviar para o backend saber qual limpar
            isRecurring: editFormData.isRecurring,
            recurrenceType: editFormData.isRecurring ? editFormData.recurrenceType : null,
            installments: editFormData.installments ? parseInt(editFormData.installments) : null,
            startDate: editFormData.startDate ? editFormData.startDate.toISOString().split('T')[0] : null,
            endDate: editFormData.endDate ? editFormData.endDate.toISOString().split('T')[0] : null,
          }),
        }
      );

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Provisionado atualizado!',
          color: 'green',
        });
        setEditModalOpened(false);
        setSelectedTransaction(null);
        loadTransactions();
      } else {
        throw new Error('Erro ao atualizar provisionado');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível atualizar o provisionado',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentSourceName = (transaction: ProvisionedTransaction) => {
    if (transaction.bankAccountId) {
      return transaction.bankAccountName || 'Conta Bancária';
    }
    if (transaction.cardId) {
      return transaction.cardName || 'Cartão';
    }
    return '⚠️ Conta a Pagar';
  };

  const handleGenerateFuture = async () => {
    if (!targetYear || parseInt(targetYear) < 2025) {
      notifications.show({
        title: 'Erro',
        message: 'Informe um ano válido (2025 ou posterior)',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/financial-controls/${controlId}/provisioned-transactions/generate-future`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ upToYear: parseInt(targetYear) }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        notifications.show({
          title: 'Sucesso',
          message: data.message,
          color: 'green',
        });
        setGenerateFutureModalOpened(false);
      } else {
        throw new Error();
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível gerar as transações futuras',
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
          <Title order={2}>Gastos Provisionados</Title>
          <Text c="dimmed" size="sm">
            Despesas e receitas recorrentes
          </Text>
        </div>
        <Group>
          <Button 
            variant="light" 
            onClick={() => setGenerateFutureModalOpened(true)}
          >
            Gerar Previsões Futuras
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={() => {
            setFormData({
              ...formData,
              accountId: '',
              observation: '',
              expectedAmount: '',
              paymentSource: 'none',
              bankAccountId: '',
              cardId: '',
              startDate: new Date(),
            });
            setModalOpened(true);
          }}>
            Novo Provisionado
          </Button>
        </Group>
      </Group>

      <Paper shadow="xs" p="md">
        <Group mb="md">
          <TextInput
            placeholder="Buscar por nome ou fonte de pagamento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Filtrar por status"
            data={[
              { value: 'all', label: 'Todos' },
              { value: 'active', label: 'Ativos' },
              { value: 'inactive', label: 'Inativos' },
            ]}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as 'all' | 'active' | 'inactive')}
            clearable={false}
            style={{ width: 150 }}
          />
        </Group>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Conta</Table.Th>
              <Table.Th>Observação</Table.Th>
              <Table.Th>Valor</Table.Th>
              <Table.Th>Fonte de Pagamento</Table.Th>
              <Table.Th>Recorrente</Table.Th>
              <Table.Th style={{ width: 100 }}>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pageLoading ? (
              // Loading skeleton
              Array(3).fill(0).map((_, index) => (
                <Table.Tr key={`skeleton-${index}`}>
                  <Table.Td><Skeleton height={20} width="80%" /></Table.Td>
                  <Table.Td><Skeleton height={20} width={60} /></Table.Td>
                  <Table.Td><Skeleton height={20} width="50%" /></Table.Td>
                  <Table.Td><Skeleton height={20} width="70%" /></Table.Td>
                  <Table.Td><Skeleton height={20} width={40} /></Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Skeleton height={30} width={30} circle />
                      <Skeleton height={30} width={30} circle />
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            ) : filteredTransactions.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={6} style={{ textAlign: 'center', padding: 32 }}>
                  <Text c="dimmed">
                    {searchQuery.trim() ? 'Nenhum provisionado encontrado' : 'Nenhum provisionado cadastrado'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredTransactions.map((transaction) => (
                <Table.Tr 
                  key={transaction.id}
                  onDoubleClick={() => openEditModal(transaction)}
                  style={{ cursor: 'pointer' }}
                >
                  <Table.Td>{transaction.accountName || 'Sem conta vinculada'}</Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed" lineClamp={1}>
                      {transaction.observation || '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td>R$ {parseFloat(transaction.expectedAmount).toFixed(2)}</Table.Td>
                  <Table.Td>{getPaymentSourceName(transaction)}</Table.Td>
                  <Table.Td>
                    {transaction.isRecurring ? (
                      <Badge color="blue" variant="light">Recorrente</Badge>
                    ) : transaction.installments ? (
                      <Badge color="orange" variant="light">
                        {transaction.currentInstallment}/{transaction.installments}x
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </Table.Td>
                  <Table.Td>
                    <div style={{ display: 'flex', gap: 8 }}>
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
                        onClick={() => handleDelete(transaction.id)}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </div>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setFormData({
            accountId: '',
            observation: '',
            expectedAmount: '',
            paymentSource: 'none',
            bankAccountId: '',
            cardId: '',
            isRecurring: false,
            recurrenceType: 'monthly',
            installments: '',
            startDate: new Date(),
            endDate: null,
          });
        }}
        title="Novo Gasto Provisionado"
        size="md"
      >
        <Stack gap="md">
          <Group align="flex-end" gap="xs">
            <Select
              label="Conta"
              placeholder="Selecione uma conta (ex: Luz, Água, Uber)"
              data={accounts.map(acc => ({
                value: acc.id,
                label: acc.name,
              }))}
              value={formData.accountId}
              onChange={(value) => setFormData({ ...formData, accountId: value || '' })}
              required
              style={{ flex: 1 }}
              searchable
            />
            <Button 
              onClick={() => setQuickAccountModalOpened(true)}
              variant="default"
            >
              <IconPlus size={16} />
            </Button>
          </Group>

          <Textarea
            label="Observação"
            placeholder="Observações adicionais (opcional)"
            value={formData.observation}
            onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
            rows={2}
          />

          <NumberInput
            label="Valor Esperado"
            placeholder="0.00"
            value={formData.expectedAmount}
            onChange={(value) => setFormData({ ...formData, expectedAmount: String(value) })}
            prefix="R$ "
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator="."
            decimalSeparator=","
            required
          />

          <Select
            label="Forma de Pagamento (Opcional)"
            placeholder="Deixe vazio se não souber ainda"
            data={[
              { value: 'none', label: 'A definir (Conta a pagar)' },
              { value: 'bank_account', label: 'Conta Bancária' },
              { value: 'card', label: 'Cartão' },
            ]}
            value={formData.paymentSource}
            onChange={(value) => setFormData({ ...formData, paymentSource: value || 'none', bankAccountId: '', cardId: '' })}
          />

          {formData.paymentSource === 'bank_account' && (
            <Select
              label="Conta Bancária"
              placeholder="Selecione a conta"
              data={bankAccounts.map((acc) => ({
                value: acc.id,
                label: `${acc.name} - ${acc.bankName}`,
              }))}
              value={formData.bankAccountId}
              onChange={(value) => setFormData({ ...formData, bankAccountId: value || '' })}
              searchable
              required
            />
          )}

          {formData.paymentSource === 'card' && (
            <Select
              label="Cartão"
              placeholder="Selecione o cartão"
              data={cards.map((card) => ({
                value: card.id,
                label: card.name,
              }))}
              value={formData.cardId}
              onChange={(value) => setFormData({ ...formData, cardId: value || '' })}
              searchable
              required
            />
          )}

          <Switch
            label="Recorrente"
            checked={formData.isRecurring}
            onChange={(e) => setFormData({ ...formData, isRecurring: e.currentTarget.checked, installments: '', startDate: null, endDate: null })}
          />

          {formData.isRecurring && (
            <>
              <Select
                label="Tipo de Recorrência"
                placeholder="Selecione"
                data={[
                  { value: 'monthly', label: 'Mensal (todo mês - ex: Netflix, Luz)' },
                  { value: 'yearly', label: 'Anual (todo ano - ex: Seguro do carro)' },
                ]}
                value={formData.recurrenceType}
                onChange={(value) => setFormData({ ...formData, recurrenceType: value || 'monthly' })}
                required
              />

              <DateInput
                label="Data de Início"
                placeholder="Selecione a data"
                value={formData.startDate}
                onChange={(value) => setFormData({ ...formData, startDate: value })}
                valueFormat="DD/MM/YYYY"
                dateParser={parseBrazilianDate}
                clearable
                required
              />

              <DateInput
                label="Data Final (Opcional)"
                placeholder="Quando encerrar (ex: cancelou Netflix)"
                value={formData.endDate}
                onChange={(value) => setFormData({ ...formData, endDate: value })}
                valueFormat="DD/MM/YYYY"
                dateParser={parseBrazilianDate}
                clearable
                description="Deixe em branco para recorrência indefinida"
              />

              <Text size="xs" c="dimmed">
                {formData.recurrenceType === 'monthly' 
                  ? 'Transações mensais serão geradas automaticamente (12 meses inicialmente)'
                  : 'Transações anuais serão geradas automaticamente (3 anos inicialmente)'}
              </Text>
            </>
          )}

          {!formData.isRecurring && (
            <>
              <NumberInput
                label="Número de Parcelas (Opcional)"
                placeholder="Ex: 12"
                value={formData.installments}
                onChange={(value) => setFormData({ ...formData, installments: String(value) })}
                min={1}
                max={120}
              />
              
              <DateInput
                label="Data de Início"
                placeholder="Selecione a data"
                value={formData.startDate}
                onChange={(value) => setFormData({ ...formData, startDate: value })}
                valueFormat="DD/MM/YYYY"
                dateParser={parseBrazilianDate}
                clearable
              />

              <DateInput
                label="Data Final (Opcional)"
                placeholder="Quando encerrar"
                value={formData.endDate}
                onChange={(value) => setFormData({ ...formData, endDate: value })}
                valueFormat="DD/MM/YYYY"
                dateParser={parseBrazilianDate}
                clearable
                description="Para gastos com prazo definido"
              />
            </>
          )}

          <Button fullWidth onClick={handleSubmit} loading={loading}>
            Criar Provisionado
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={editModalOpened}
        onClose={() => {
          setEditModalOpened(false);
          setSelectedTransaction(null);
        }}
        title="Editar Gasto Provisionado"
        size="md"
      >
        <Stack gap="md">
          <Select
            label="Conta"
            placeholder="Selecione uma conta"
            data={accounts.map(acc => ({
              value: acc.id,
              label: acc.name,
            }))}
            value={editFormData.accountId}
            onChange={(value) => setEditFormData({ ...editFormData, accountId: value || '' })}
            required
            searchable
          />

          <Textarea
            label="Observação"
            placeholder="Observações adicionais (opcional)"
            value={editFormData.observation}
            onChange={(e) => setEditFormData({ ...editFormData, observation: e.target.value })}
            rows={2}
          />

          <NumberInput
            label="Valor Esperado"
            placeholder="0.00"
            value={editFormData.expectedAmount}
            onChange={(value) => setEditFormData({ ...editFormData, expectedAmount: String(value) })}
            prefix="R$ "
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator="."
            decimalSeparator=","
            required
          />

          <Select
            label="Forma de Pagamento (Opcional)"
            placeholder="Deixe vazio se não souber ainda"
            data={[
              { value: 'none', label: 'A definir (Conta a pagar)' },
              { value: 'bank_account', label: 'Conta Bancária' },
              { value: 'card', label: 'Cartão' },
            ]}
            value={editFormData.paymentSource}
            onChange={(value) => setEditFormData({ ...editFormData, paymentSource: value || 'none', bankAccountId: '', cardId: '' })}
          />

          {editFormData.paymentSource === 'bank_account' && (
            <Select
              label="Conta Bancária"
              placeholder="Selecione a conta"
              data={bankAccounts.map((acc) => ({
                value: acc.id,
                label: `${acc.name} - ${acc.bankName}`,
              }))}
              value={editFormData.bankAccountId}
              onChange={(value) => setEditFormData({ ...editFormData, bankAccountId: value || '' })}
              searchable
              required
            />
          )}

          {editFormData.paymentSource === 'card' && (
            <Select
              label="Cartão"
              placeholder="Selecione o cartão"
              data={cards.map((card) => ({
                value: card.id,
                label: card.name,
              }))}
              value={editFormData.cardId}
              onChange={(value) => setEditFormData({ ...editFormData, cardId: value || '' })}
              searchable
              required
            />
          )}

          <Switch
            label="Recorrente"
            checked={editFormData.isRecurring}
            onChange={(e) => setEditFormData({ ...editFormData, isRecurring: e.currentTarget.checked, installments: '', startDate: null })}
          />

          {editFormData.isRecurring && (
            <>
              <Select
                label="Tipo de Recorrência"
                placeholder="Selecione"
                data={[
                  { value: 'monthly', label: 'Mensal (todo mês - ex: Netflix, Luz)' },
                  { value: 'yearly', label: 'Anual (todo ano - ex: Seguro do carro)' },
                ]}
                value={editFormData.recurrenceType}
                onChange={(value) => setEditFormData({ ...editFormData, recurrenceType: value || 'monthly' })}
                required
              />

              <DateInput
                label="Data de Início"
                placeholder="Selecione a data"
                value={editFormData.startDate}
                onChange={(value) => setEditFormData({ ...editFormData, startDate: value })}
                valueFormat="DD/MM/YYYY"
                dateParser={parseBrazilianDate}
                clearable
                required
              />

              <DateInput
                label="Data Final (Opcional)"
                placeholder="Quando encerrar (ex: cancelou Netflix)"
                value={editFormData.endDate}
                onChange={(value) => setEditFormData({ ...editFormData, endDate: value })}
                valueFormat="DD/MM/YYYY"
                dateParser={parseBrazilianDate}
                clearable
                description="Deixe em branco para recorrência indefinida"
              />

              <Text size="xs" c="dimmed">
                {editFormData.recurrenceType === 'monthly' 
                  ? 'Transações mensais serão geradas automaticamente (12 meses inicialmente)'
                  : 'Transações anuais serão geradas automaticamente (3 anos inicialmente)'}
              </Text>
            </>
          )}

          {!editFormData.isRecurring && (
            <>
              <NumberInput
                label="Número de Parcelas (Opcional)"
                placeholder="Ex: 12"
                value={editFormData.installments}
                onChange={(value) => setEditFormData({ ...editFormData, installments: String(value) })}
                min={1}
                max={120}
              />
              
              <DateInput
                label="Data de Início"
                placeholder="Selecione a data"
                value={editFormData.startDate}
                onChange={(value) => setEditFormData({ ...editFormData, startDate: value })}
                valueFormat="DD/MM/YYYY"
                dateParser={parseBrazilianDate}
                clearable
              />

              <DateInput
                label="Data Final (Opcional)"
                placeholder="Quando encerrar"
                value={editFormData.endDate}
                onChange={(value) => setEditFormData({ ...editFormData, endDate: value })}
                valueFormat="DD/MM/YYYY"
                dateParser={parseBrazilianDate}
                clearable
                description="Para gastos com prazo definido"
              />
            </>
          )}

          <Button fullWidth onClick={handleEdit} loading={loading}>
            Salvar Alterações
          </Button>
        </Stack>
      </Modal>

      {/* Modal de Criação Rápida de Conta */}
      <Modal
        opened={quickAccountModalOpened}
        onClose={() => {
          setQuickAccountModalOpened(false);
          setQuickAccountData({ name: '', type: 'expense', classificationId: null, description: '' });
        }}
        title="Criar Conta Rapidamente"
        size="sm"
      >
        <Stack gap="md">
          <TextInput
            label="Nome da Conta"
            placeholder="Ex: Luz, Água, Salário..."
            value={quickAccountData.name}
            onChange={(e) => setQuickAccountData({ ...quickAccountData, name: e.currentTarget.value })}
            required
          />
          
          <Textarea
            label="Observação"
            placeholder="Descrição opcional da conta"
            value={quickAccountData.description}
            onChange={(e) => setQuickAccountData({ ...quickAccountData, description: e.currentTarget.value })}
            rows={2}
          />
          
          <Select
            label="Tipo"
            placeholder="Selecione o tipo"
            data={[
              { value: 'expense', label: 'Despesa' },
              { value: 'income', label: 'Receita' },
            ]}
            value={quickAccountData.type}
            onChange={(value) => setQuickAccountData({ ...quickAccountData, type: (value as 'expense' | 'income') || 'expense' })}
            required
          />
          
          <Stack gap="xs">
            <Text size="sm" fw={500}>Classificação</Text>
            <Group gap="xs" align="flex-end">
              <Select
                placeholder="Selecione uma classificação (opcional)"
                value={quickAccountData.classificationId}
                onChange={(value) => setQuickAccountData({ ...quickAccountData, classificationId: value })}
                data={classifications.map(c => ({ value: c.id, label: c.name }))}
                clearable
                searchable
                style={{ flex: 1 }}
              />
              <Button
                variant="light"
                size="sm"
                onClick={() => setNewClassificationModalOpened(true)}
              >
                +
              </Button>
            </Group>
          </Stack>

          <Button fullWidth onClick={handleQuickAccountCreate} loading={loading}>
            Criar e Selecionar
          </Button>
        </Stack>
      </Modal>

      {/* Modal: Nova Classificação */}
      <Modal
        opened={newClassificationModalOpened}
        onClose={() => {
          setNewClassificationModalOpened(false);
          setNewClassificationName('');
          setNewClassificationDescription('');
        }}
        title="Nova Classificação"
        size="sm"
      >
        <Stack>
          <TextInput
            label="Nome"
            placeholder="Ex: Moradia, Transporte, Alimentação"
            value={newClassificationName}
            onChange={(e) => setNewClassificationName(e.target.value)}
            required
            data-autofocus
          />

          <Textarea
            label="Descrição"
            placeholder="Descrição opcional"
            value={newClassificationDescription}
            onChange={(e) => setNewClassificationDescription(e.target.value)}
            rows={3}
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => {
                setNewClassificationModalOpened(false);
                setNewClassificationName('');
                setNewClassificationDescription('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateClassification} loading={loading}>
              Criar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal de Exclusão */}
      <Modal
        opened={deleteModalOpened}
        onClose={() => {
          setDeleteModalOpened(false);
          setTransactionToDelete(null);
          setDeleteInfo(null);
        }}
        title="Excluir Gasto Provisionado"
        size="lg"
      >
        <Stack gap="md">
          {deleteInfo && (
            <>
              <Text size="sm">
                Este gasto provisionado tem <strong>{deleteInfo.totalTransactions} transações mensais</strong> vinculadas:
              </Text>
              
              <Paper withBorder p="sm" bg="gray.0">
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="green">Transações pagas:</Text>
                    <Badge color="green">{deleteInfo.paidTransactions}</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="orange">Transações não pagas:</Text>
                    <Badge color="orange">{deleteInfo.unpaidTransactions}</Badge>
                  </Group>
                </Stack>
              </Paper>

              <Text size="sm" fw={500} mt="md">
                O que deseja fazer?
              </Text>

              <Select
                label="Estratégia de exclusão"
                value={deleteStrategy}
                onChange={(value) => setDeleteStrategy(value as 'all' | 'unpaid' | 'period')}
                data={[
                  { value: 'unpaid', label: 'Remover apenas transações não pagas' },
                  { value: 'all', label: 'Remover TODAS as transações (incluindo pagas)' },
                  { value: 'period', label: 'Remover transações de um período específico' },
                ]}
              />

              {deleteStrategy === 'period' && (
                <Group grow>
                  <TextInput
                    label="Mês inicial"
                    placeholder="2025-01"
                    value={deletePeriod.startMonth}
                    onChange={(e) => setDeletePeriod({ ...deletePeriod, startMonth: e.target.value })}
                  />
                  <TextInput
                    label="Mês final"
                    placeholder="2025-12"
                    value={deletePeriod.endMonth}
                    onChange={(e) => setDeletePeriod({ ...deletePeriod, endMonth: e.target.value })}
                  />
                </Group>
              )}

              <Group justify="space-between" mt="md">
                <Button
                  variant="default"
                  onClick={() => {
                    setDeleteModalOpened(false);
                    setTransactionToDelete(null);
                    setDeleteInfo(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  color="red"
                  loading={loading}
                  onClick={() => transactionToDelete && confirmDelete(transactionToDelete, deleteStrategy)}
                >
                  Confirmar Exclusão
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>

      {/* Modal para Gerar Previsões Futuras */}
      <Modal
        opened={generateFutureModalOpened}
        onClose={() => setGenerateFutureModalOpened(false)}
        title="Gerar Previsões Futuras"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Este recurso gera transações futuras para todos os gastos provisionados recorrentes (mensal ou anual).
          </Text>
          
          <NumberInput
            label="Gerar até o ano"
            placeholder="Ex: 2027"
            value={targetYear}
            onChange={(value) => setTargetYear(String(value))}
            min={2025}
            max={2099}
            required
            description="Todas as transações recorrentes serão geradas até dezembro do ano informado"
          />

          <Paper withBorder p="sm" bg="blue.0">
            <Text size="sm" fw={500} mb={4}>💡 Como funciona:</Text>
            <Text size="xs" c="dimmed">
              • <strong>Recorrentes mensais</strong> (Netflix, Spotify): Gera 1 transação por mês<br />
              • <strong>Recorrentes anuais</strong> (Seguro do carro): Gera 1 transação por ano<br />
              • Não duplica transações já existentes
            </Text>
          </Paper>

          <Group justify="flex-end">
            <Button variant="light" onClick={() => setGenerateFutureModalOpened(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerateFuture} loading={loading}>
              Gerar Transações
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
