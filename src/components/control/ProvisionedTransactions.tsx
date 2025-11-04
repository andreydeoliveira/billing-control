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
  ColorInput,
  Textarea,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface ProvisionedTransaction {
  id: string;
  name: string;
  type: string;
  expectedAmount: string;
  bankAccountId: string | null;
  cardId: string | null;
  bankAccountName?: string;
  cardName?: string;
  isRecurring: boolean;
  installments: number | null;
  currentInstallment: number;
  accountId: string;
  accountName?: string;
  observation?: string | null;
  startDate?: string | null;
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
  const [selectedTransaction, setSelectedTransaction] = useState<ProvisionedTransaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [formData, setFormData] = useState({
    accountId: '',
    observation: '',
    expectedAmount: '',
    paymentSource: 'bank_account', // 'bank_account' ou 'card'
    bankAccountId: '',
    cardId: '',
    isRecurring: true,
    installments: '',
    startDate: null as Date | null,
  });
  const [editFormData, setEditFormData] = useState({
    accountId: '',
    observation: '',
    expectedAmount: '',
    paymentSource: 'bank_account',
    bankAccountId: '',
    cardId: '',
    isRecurring: true,
    installments: '',
    startDate: null as Date | null,
  });
  const [quickAccountData, setQuickAccountData] = useState({
    name: '',
    type: 'expense' as 'expense' | 'income',
    color: '#4CAF50',
  });

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

  useEffect(() => {
    loadTransactions();
    loadBankAccounts();
    loadCards();
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredTransactions(transactions);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = transactions.filter(
        (transaction) =>
          transaction.name.toLowerCase().includes(query) ||
          (transaction.bankAccountName && transaction.bankAccountName.toLowerCase().includes(query)) ||
          (transaction.cardName && transaction.cardName.toLowerCase().includes(query))
      );
      setFilteredTransactions(filtered);
    }
  }, [searchQuery, transactions]);

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
          color: quickAccountData.color,
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
        setQuickAccountData({ name: '', type: 'expense', color: '#4CAF50' });
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
          installments: formData.installments ? parseInt(formData.installments) : null,
          startDate: formData.startDate ? formData.startDate.toISOString().split('T')[0] : null,
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
          installments: '',
          startDate: null,
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
    setEditFormData({
      accountId: transaction.accountId,
      observation: transaction.observation || '',
      expectedAmount: transaction.expectedAmount,
      paymentSource: transaction.bankAccountId ? 'bank_account' : 'card',
      bankAccountId: transaction.bankAccountId || '',
      cardId: transaction.cardId || '',
      isRecurring: transaction.isRecurring,
      installments: transaction.installments ? String(transaction.installments) : '',
      startDate: transaction.startDate ? new Date(transaction.startDate) : null,
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
            isRecurring: editFormData.isRecurring,
            installments: editFormData.installments ? parseInt(editFormData.installments) : null,
            startDate: editFormData.startDate ? editFormData.startDate.toISOString().split('T')[0] : null,
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
    return '-';
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
        <Button leftSection={<IconPlus size={16} />} onClick={() => setModalOpened(true)}>
          Novo Provisionado
        </Button>
      </Group>

      <Paper shadow="xs" p="md">
        <TextInput
          placeholder="Buscar por nome ou fonte de pagamento..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          mb="md"
        />

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
            paymentSource: 'bank_account',
            bankAccountId: '',
            cardId: '',
            isRecurring: false,
            installments: '',
            startDate: null,
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
            label="Forma de Pagamento"
            data={[
              { value: 'bank_account', label: 'Conta Bancária' },
              { value: 'card', label: 'Cartão' },
            ]}
            value={formData.paymentSource}
            onChange={(value) => setFormData({ ...formData, paymentSource: value || 'bank_account', bankAccountId: '', cardId: '' })}
            required
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
              required
            />
          )}

          <Switch
            label="Recorrente (mensalmente)"
            checked={formData.isRecurring}
            onChange={(e) => setFormData({ ...formData, isRecurring: e.currentTarget.checked, installments: '', startDate: null })}
          />

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
                clearable
              />
            </>
          )}

          {formData.isRecurring && (
            <Text size="xs" c="dimmed">
              Transações recorrentes são geradas automaticamente todo mês
            </Text>
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
            label="Forma de Pagamento"
            data={[
              { value: 'bank_account', label: 'Conta Bancária' },
              { value: 'card', label: 'Cartão' },
            ]}
            value={editFormData.paymentSource}
            onChange={(value) => setEditFormData({ ...editFormData, paymentSource: value || 'bank_account', bankAccountId: '', cardId: '' })}
            required
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
              required
            />
          )}

          <Switch
            label="Recorrente (mensalmente)"
            checked={editFormData.isRecurring}
            onChange={(e) => setEditFormData({ ...editFormData, isRecurring: e.currentTarget.checked, installments: '', startDate: null })}
          />

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
                clearable
              />
            </>
          )}

          {editFormData.isRecurring && (
            <Text size="xs" c="dimmed">
              Transações recorrentes são geradas automaticamente todo mês
            </Text>
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
          setQuickAccountData({ name: '', type: 'expense', color: '#228BE6' });
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
          
          <ColorInput
            label="Cor"
            value={quickAccountData.color}
            onChange={(value) => setQuickAccountData({ ...quickAccountData, color: value })}
            format="hex"
            swatches={['#228BE6', '#40C057', '#FA5252', '#FD7E14', '#BE4BDB', '#15AABF', '#E64980']}
          />

          <Button fullWidth onClick={handleQuickAccountCreate} loading={loading}>
            Criar e Selecionar
          </Button>
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
    </div>
  );
}
