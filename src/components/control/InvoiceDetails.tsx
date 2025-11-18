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
  TextInput,
  Divider,
  Textarea,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconCreditCard, IconEdit, IconTrash, IconPlus, IconCheck } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import dayjs from 'dayjs';
import { parseBrazilianDate } from '@/lib/date-parser';

interface Transaction {
  id: string;
  name: string;
  type: 'income' | 'expense';
  expectedAmount: string;
  actualAmount: string | null;
  paidDate: string | null;
  installmentNumber: number | null;
  totalInstallments: number | null;
  accountId: string | null;
  provisionedTransactionId: string | null;
}

interface InvoiceDetailsProps {
  opened: boolean;
  onClose: () => void;
  invoiceId: string;
  cardId: string;
  cardName: string;
  totalAmount: string;
  dueDate: string | null;
  isPaid: boolean;
  paidDate: string | null;
  bankAccountId: string | null;
  controlId: string;
  onUpdate: () => void;
}

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
}

interface ExpenseIncomeAccount {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

export function InvoiceDetails({
  opened,
  onClose,
  invoiceId,
  cardId,
  cardName,
  totalAmount,
  dueDate,
  isPaid,
  paidDate,
  bankAccountId,
  controlId,
  onUpdate,
}: InvoiceDetailsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [accounts, setAccounts] = useState<ExpenseIncomeAccount[]>([]);
  const [expectedTotal, setExpectedTotal] = useState(totalAmount);
  const [actualTotal, setActualTotal] = useState('0');
  const [loading, setLoading] = useState(false);
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [addModalOpened, setAddModalOpened] = useState(false);
  const [addAccountModalOpened, setAddAccountModalOpened] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    actualAmount: '',
    paidDate: null as Date | null,
  });
  const [addForm, setAddForm] = useState({
    accountId: '',
    expectedAmount: '',
    paidDate: null as Date | null,
    observation: '',
  });
  const [newAccountForm, setNewAccountForm] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    classificationId: null as string | null,
    description: '',
  });
  const [classifications, setClassifications] = useState<Array<{ id: string; name: string }>>([]);
  const [newClassificationModalOpened, setNewClassificationModalOpened] = useState(false);
  const [newClassificationName, setNewClassificationName] = useState('');
  const [newClassificationDescription, setNewClassificationDescription] = useState('');
  const [paymentForm, setPaymentForm] = useState({
    bankAccountId: bankAccountId || '',
    paidDate: paidDate ? new Date(paidDate) : new Date(),
  });

  const loadTransactions = async () => {
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/card-invoices/${invoiceId}/transactions`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
        
        // Calcular total esperado (apenas transações provisionadas)
        const expected = data.reduce((sum: number, t: Transaction) => {
          if (t.provisionedTransactionId) {
            const amount = parseFloat(t.expectedAmount || '0');
            return sum + amount;
          }
          return sum;
        }, 0);
        setExpectedTotal(expected.toFixed(2));
        
        // Calcular total real (apenas transações com valor confirmado - actualAmount e paidDate)
        const actual = data.reduce((sum: number, t: Transaction) => {
          if (t.actualAmount && t.paidDate) {
            const amount = parseFloat(t.actualAmount);
            return sum + amount;
          }
          return sum;
        }, 0);
        setActualTotal(actual.toFixed(2));
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

  const loadAccounts = async () => {
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/expense-income-accounts`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
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
    if (opened) {
      loadTransactions();
      loadBankAccounts();
      loadAccounts();
      loadClassifications();
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

  const handleUnpayInvoice = async () => {
    modals.openConfirmModal({
      title: 'Desmarcar Pagamento',
      children: (
        <Text size="sm">
          Tem certeza que deseja desmarcar esta fatura como paga? Isso permitirá alterar os dados de pagamento.
        </Text>
      ),
      labels: { confirm: 'Desmarcar', cancel: 'Cancelar' },
      confirmProps: { color: 'orange' },
      onConfirm: async () => {
        setLoading(true);
        try {
          const response = await fetch(
            `/api/financial-controls/${controlId}/card-invoices/${invoiceId}/pay`,
            { method: 'DELETE' }
          );

          if (response.ok) {
            notifications.show({
              title: 'Sucesso',
              message: 'Pagamento desmarcado',
              color: 'green',
            });
            onUpdate();
          } else {
            throw new Error('Erro ao desmarcar');
          }
        } catch {
          notifications.show({
            title: 'Erro',
            message: 'Não foi possível desmarcar o pagamento',
            color: 'red',
          });
        } finally {
          setLoading(false);
        }
      },
    });
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

  const openAddModal = () => {
    setAddForm({
      accountId: '',
      expectedAmount: '',
      paidDate: null,
      observation: '',
    });
    setAddModalOpened(true);
  };

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
        setNewAccountForm({ ...newAccountForm, classificationId: newClassification.id });
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

  const handleCreateAccount = async () => {
    if (!newAccountForm.name) {
      notifications.show({
        title: 'Erro',
        message: 'Digite o nome da conta',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/financial-controls/${controlId}/expense-income-accounts`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAccountForm),
        }
      );

      if (response.ok) {
        const newAccount = await response.json();
        notifications.show({
          title: 'Sucesso',
          message: 'Conta cadastrada',
          color: 'green',
        });
        setAddAccountModalOpened(false);
        setNewAccountForm({ name: '', type: 'expense', classificationId: null, description: '' });
        
        // Recarregar contas e selecionar a nova
        await loadAccounts();
        setAddForm({ ...addForm, accountId: newAccount.id });
      } else {
        throw new Error('Erro ao criar conta');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível criar a conta',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!addForm.accountId || !addForm.expectedAmount) {
      notifications.show({
        title: 'Erro',
        message: 'Preencha todos os campos obrigatórios',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `/api/financial-controls/${controlId}/monthly-transactions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accountId: addForm.accountId,
            expectedAmount: addForm.expectedAmount,
            actualAmount: addForm.expectedAmount,
            paidDate: addForm.paidDate ? dayjs(addForm.paidDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
            paymentMethod: 'credit_card',
            cardId: cardId,
            monthYear: dayjs().format('YYYY-MM'),
            observation: addForm.observation || null,
          }),
        }
      );

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Transação adicionada ao cartão',
          color: 'green',
        });
        setAddModalOpened(false);
        loadTransactions();
        onUpdate(); // Atualizar total da fatura
      } else {
        throw new Error('Erro ao adicionar');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível adicionar a transação',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    modals.openConfirmModal({
      title: 'Excluir Transação',
      children: (
        <Text size="sm">
          Tem certeza que deseja excluir <strong>{transaction.name}</strong>?
          {transaction.totalInstallments && (
            <Text c="orange" mt="sm">
              ⚠️ Esta é uma parcela {transaction.installmentNumber}/{transaction.totalInstallments}. 
              Apenas esta parcela será excluída.
            </Text>
          )}
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const response = await fetch(
            `/api/financial-controls/${controlId}/monthly-transactions/${transaction.id}`,
            { method: 'DELETE' }
          );

          if (response.ok) {
            notifications.show({
              title: 'Sucesso',
              message: 'Transação excluída',
              color: 'green',
            });
            loadTransactions();
            onUpdate(); // Atualizar total da fatura
          } else {
            throw new Error('Erro ao excluir');
          }
        } catch {
          notifications.show({
            title: 'Erro',
            message: 'Não foi possível excluir a transação',
            color: 'red',
          });
        }
      },
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group justify="space-between" style={{ width: '100%' }}>
          <Group>
            <IconCreditCard size={20} />
            <div>
              <Title order={4}>{cardName}</Title>
              <Text size="xs" c="dimmed">
                Venc: {dueDate ? dayjs(dueDate).format('DD/MM/YYYY') : 'N/D'} • 
                Previsto: <Text span fw={500} c="orange">R$ {parseFloat(expectedTotal).toFixed(2)}</Text> •
                Real: <Text span fw={700} c="blue">R$ {parseFloat(actualTotal).toFixed(2)}</Text> • 
                {isPaid ? (
                  <Text span c="green">Paga {paidDate && `em ${dayjs(paidDate).format('DD/MM')}`}</Text>
                ) : (
                  <Text span c="orange">Em Aberto</Text>
                )}
              </Text>
            </div>
          </Group>
          <Button
            leftSection={<IconPlus size={16} />}
            size="xs"
            onClick={openAddModal}
          >
            Novo Item
          </Button>
        </Group>
      }
      size="90%"
      styles={{
        body: { height: '75vh', display: 'flex', flexDirection: 'column' },
      }}
    >
      <Stack style={{ height: '100%', overflow: 'hidden' }}>
        {/* Tabela de Transações */}
        <div style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>
          <Table striped highlightOnHover stickyHeader>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Descrição</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Parcela</Table.Th>
                <Table.Th>Valor Esperado</Table.Th>
                <Table.Th>Valor Real</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th style={{ width: 80 }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {transactions.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>
                    <Text c="dimmed">Nenhuma transação nesta fatura</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                transactions.map((transaction) => (
                  <Table.Tr 
                    key={transaction.id}
                    onDoubleClick={() => openEditModal(transaction)}
                    style={{ cursor: 'pointer' }}
                  >
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
                      <Text c="dimmed">
                        R$ {parseFloat(transaction.expectedAmount).toFixed(2)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500} c={transaction.actualAmount ? 'blue' : 'dimmed'}>
                        R$ {parseFloat(transaction.actualAmount || transaction.expectedAmount).toFixed(2)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      {transaction.actualAmount && transaction.paidDate ? (
                        <Badge color="green" variant="light">✓ Confirmado</Badge>
                      ) : (
                        <Badge color="orange" variant="light">Pendente</Badge>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap={4}>
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
                          onClick={() => handleDeleteTransaction(transaction)}
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
        </div>

        {/* Pagamento da Fatura - Compacto */}
        <div style={{ borderTop: '1px solid #e9ecef', paddingTop: 12 }}>
          {isPaid ? (
            <Group justify="space-between" align="center">
              <Group gap="xl">
                <div>
                  <Text size="xs" c="dimmed">Pago via</Text>
                  <Text size="sm" fw={500}>
                    {bankAccounts.find(acc => acc.id === paymentForm.bankAccountId)?.name || 'N/D'}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed">Data</Text>
                  <Text size="sm" fw={500}>
                    {paidDate ? dayjs(paidDate).format('DD/MM/YYYY') : 'N/D'}
                  </Text>
                </div>
              </Group>
              <Button
                variant="light"
                color="orange"
                size="xs"
                onClick={handleUnpayInvoice}
              >
                Editar
              </Button>
            </Group>
          ) : (
            <Group align="end" gap="sm">
              <Select
                label="Conta Bancária"
                placeholder="Selecione"
                value={paymentForm.bankAccountId}
                onChange={(value) => setPaymentForm({ ...paymentForm, bankAccountId: value || '' })}
                data={bankAccounts.map((acc) => ({
                  value: acc.id,
                  label: `${acc.name} - ${acc.bankName}`,
                }))}
                style={{ flex: 1 }}
                required
              />
              <DateInput
                label="Data"
                value={paymentForm.paidDate}
                onChange={(value) => setPaymentForm({ ...paymentForm, paidDate: value || new Date() })}
                valueFormat="DD/MM/YYYY"
                dateParser={parseBrazilianDate}
                style={{ width: 140 }}
                required
              />
              <Button onClick={handlePayInvoice} loading={loading}>
                Pagar Fatura
              </Button>
            </Group>
          )}
        </div>
      </Stack>

      {/* Modal de Edição de Transação */}
      <Modal
        opened={editModalOpened}
        onClose={() => {
          setEditModalOpened(false);
          setSelectedTransaction(null);
        }}
        title="Confirmar Valor da Compra"
      >
        <Stack>
          {selectedTransaction && (
            <>
              <Text size="sm" c="dimmed">
                <strong>{selectedTransaction.name}</strong>
              </Text>
              <Text size="xs" c="dimmed">
                Confirme o valor real cobrado e a data da compra. Isso não marca a fatura como paga.
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
                dateParser={parseBrazilianDate}
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

      {/* Modal de Adicionar Transação */}
      <Modal
        opened={addModalOpened}
        onClose={() => setAddModalOpened(false)}
        title="Adicionar Lançamento no Cartão"
      >
        <Stack>
          <Group align="flex-end" gap="xs">
            <Select
              label="Conta"
              placeholder="Selecione a conta (ex: Luz, Água, Gasolina)"
              value={addForm.accountId}
              onChange={(value) => setAddForm({ ...addForm, accountId: value || '' })}
              data={accounts.map((acc) => ({
                value: acc.id,
                label: `${acc.name} (${acc.type === 'income' ? 'Receita' : 'Despesa'})`,
              }))}
              searchable
              required
              style={{ flex: 1 }}
            />
            <Button
              onClick={() => setAddAccountModalOpened(true)}
              variant="default"
            >
              <IconPlus size={16} />
            </Button>
          </Group>

          <NumberInput
            label="Valor"
            value={addForm.expectedAmount}
            onChange={(value) => setAddForm({ ...addForm, expectedAmount: value?.toString() || '' })}
            prefix="R$ "
            decimalScale={2}
            fixedDecimalScale
            required
          />

          <DateInput
            label="Data da Compra"
            value={addForm.paidDate}
            onChange={(value) => setAddForm({ ...addForm, paidDate: value })}
            valueFormat="DD/MM/YYYY"
            dateParser={parseBrazilianDate}
            clearable
          />

          <Textarea
            label="Observação (Opcional)"
            placeholder="Ex: Compra parcelada, desconto, etc."
            value={addForm.observation}
            onChange={(e) => setAddForm({ ...addForm, observation: e.target.value })}
            rows={2}
          />

          <Group justify="space-between">
            <Button variant="default" onClick={() => setAddModalOpened(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTransaction} loading={loading}>
              Adicionar
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modal de Cadastrar Nova Conta */}
      <Modal
        opened={addAccountModalOpened}
        onClose={() => {
          setAddAccountModalOpened(false);
          setNewAccountForm({ name: '', type: 'expense', classificationId: null, description: '' });
        }}
        title="Cadastro Rápido de Conta"
        size="sm"
      >
        <Stack>
          <TextInput
            label="Nome da Conta"
            placeholder="Ex: Netflix, Spotify, Uber"
            value={newAccountForm.name}
            onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })}
            required
            data-autofocus
          />

          <Textarea
            label="Observação"
            placeholder="Descrição opcional da conta"
            value={newAccountForm.description}
            onChange={(e) => setNewAccountForm({ ...newAccountForm, description: e.target.value })}
            rows={2}
          />

          <Select
            label="Tipo"
            value={newAccountForm.type}
            onChange={(value) => setNewAccountForm({ ...newAccountForm, type: value as 'income' | 'expense' })}
            data={[
              { value: 'expense', label: 'Despesa' },
              { value: 'income', label: 'Receita' },
            ]}
            required
          />

          <Stack gap="xs">
            <Text size="sm" fw={500}>Classificação</Text>
            <Group gap="xs" align="flex-end">
              <Select
                placeholder="Selecione uma classificação (opcional)"
                value={newAccountForm.classificationId}
                onChange={(value) => setNewAccountForm({ ...newAccountForm, classificationId: value })}
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

          <Group justify="flex-end" mt="md">
            <Button 
              variant="default" 
              onClick={() => {
                setAddAccountModalOpened(false);
                setNewAccountForm({ name: '', type: 'expense', classificationId: null, description: '' });
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateAccount} 
              loading={loading}
            >
              Salvar
            </Button>
          </Group>
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
    </Modal>
  );
}
