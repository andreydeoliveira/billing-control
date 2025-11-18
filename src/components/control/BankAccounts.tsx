'use client';

import { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  Text,
  Button,
  Table,
  Modal,
  Stack,
  TextInput,
  NumberInput,
  ActionIcon,
  Group,
  Checkbox,
  Badge,
  Skeleton,
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconChartLine } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { BankAccountYieldModal } from './BankAccountYieldModal';

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  initialBalance: string | null;
  trackBalance: boolean;
  createdAt: string;
}

interface BankAccountsProps {
  controlId: string;
}

export function BankAccounts({ controlId }: BankAccountsProps) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<BankAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpened, setModalOpened] = useState(false);
  const [yieldModalOpened, setYieldModalOpened] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    bankName: '',
    initialBalance: '',
    trackBalance: false,
  });

  const loadAccounts = async () => {
    setPageLoading(true);
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/bank-accounts`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data);
        setFilteredAccounts(data);
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredAccounts(accounts);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = accounts.filter(
        (account) =>
          account.name.toLowerCase().includes(query) ||
          account.bankName.toLowerCase().includes(query)
      );
      setFilteredAccounts(filtered);
    }
  }, [searchQuery, accounts]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.bankName) {
      notifications.show({
        title: 'Erro',
        message: 'Preencha o nome da conta e o banco',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const url = `/api/financial-controls/${controlId}/bank-accounts`;
      const method = editingAccount ? 'PUT' : 'POST';

      const body = editingAccount
        ? {
            id: editingAccount.id,
            name: formData.name,
            bankName: formData.bankName,
            initialBalance: formData.initialBalance || null,
            trackBalance: formData.trackBalance,
          }
        : {
            name: formData.name,
            bankName: formData.bankName,
            initialBalance: formData.initialBalance || null,
            trackBalance: formData.trackBalance,
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: editingAccount ? 'Conta atualizada!' : 'Conta bancária criada!',
          color: 'green',
        });
        setModalOpened(false);
        setEditingAccount(null);
        setFormData({ name: '', bankName: '', initialBalance: '', trackBalance: false });
        loadAccounts();
      } else {
        const errorData = await response.json();
        console.error('Erro ao salvar conta:', errorData);
        throw new Error(errorData.error || 'Erro ao salvar conta');
      }
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      notifications.show({
        title: 'Erro',
        message: editingAccount ? 'Não foi possível atualizar a conta bancária' : 'Não foi possível criar a conta bancária',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (account: BankAccount) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      bankName: account.bankName,
      initialBalance: account.initialBalance || '',
      trackBalance: account.trackBalance,
    });
    setModalOpened(true);
  };

  const openCreateModal = () => {
    setEditingAccount(null);
    setFormData({ name: '', bankName: '', initialBalance: '', trackBalance: false });
    setModalOpened(true);
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta? Todas as transações vinculadas serão desvinculadas.')) {
      return;
    }

    setPageLoading(true);
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/bank-accounts/${accountId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Conta excluída com sucesso',
          color: 'green',
        });
        loadAccounts();
      } else {
        throw new Error('Erro ao excluir conta');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível excluir a conta',
        color: 'red',
      });
    } finally {
      setPageLoading(false);
    }
  };

  return (
    <div>
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Contas Bancárias</Title>
          <Text c="dimmed" size="sm">
            Gerencie suas contas e saldos
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Nova Conta
        </Button>
      </Group>

      <Paper shadow="xs" p="md">
        <TextInput
          placeholder="Buscar por nome ou banco..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          mb="md"
        />

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome da Conta</Table.Th>
              <Table.Th>Banco</Table.Th>
              <Table.Th>Saldo Inicial</Table.Th>
              <Table.Th>Controlar Saldo</Table.Th>
              <Table.Th style={{ width: 150 }}>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pageLoading ? (
              // Loading skeleton
              Array(3).fill(0).map((_, index) => (
                <Table.Tr key={`skeleton-${index}`}>
                  <Table.Td><Skeleton height={20} width="80%" /></Table.Td>
                  <Table.Td><Skeleton height={20} width="60%" /></Table.Td>
                  <Table.Td><Skeleton height={20} width="50%" /></Table.Td>
                  <Table.Td><Skeleton height={20} width="40%" /></Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Skeleton height={30} width={30} circle />
                      <Skeleton height={30} width={30} circle />
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            ) : filteredAccounts.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5} style={{ textAlign: 'center', padding: 32 }}>
                  <Text c="dimmed">
                    {searchQuery ? 'Nenhuma conta encontrada' : 'Nenhuma conta cadastrada'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredAccounts.map((account) => (
                <Table.Tr 
                  key={account.id}
                  onDoubleClick={() => openEditModal(account)}
                  style={{ cursor: 'pointer' }}
                >
                  <Table.Td>{account.name}</Table.Td>
                  <Table.Td>{account.bankName}</Table.Td>
                  <Table.Td>
                    {account.initialBalance
                      ? `R$ ${parseFloat(account.initialBalance).toFixed(2)}`
                      : '-'}
                  </Table.Td>
                  <Table.Td>
                    {account.trackBalance ? (
                      <Badge color="green" size="sm">Sim</Badge>
                    ) : (
                      <Badge color="gray" size="sm">Não</Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <ActionIcon 
                        variant="subtle" 
                        color="green"
                        onClick={() => {
                          setSelectedAccount(account);
                          setYieldModalOpened(true);
                        }}
                        title="Rendimentos"
                      >
                        <IconChartLine size={16} />
                      </ActionIcon>
                      <ActionIcon 
                        variant="subtle" 
                        color="blue"
                        onClick={() => openEditModal(account)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon 
                        variant="subtle" 
                        color="red"
                        onClick={() => handleDelete(account.id)}
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
          setEditingAccount(null);
        }}
        title={editingAccount ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Nome da Conta"
            placeholder="Ex: Conta BTG Andrey"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <TextInput
            label="Banco"
            placeholder="Ex: BTG, Nubank, Inter"
            value={formData.bankName}
            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            required
          />
          <NumberInput
            label="Saldo Inicial (Opcional)"
            placeholder="0.00"
            value={formData.initialBalance}
            onChange={(value) => setFormData({ ...formData, initialBalance: String(value) })}
            prefix="R$ "
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator="."
            decimalSeparator=","
          />
          <Checkbox
            label="Controlar saldo mensal desta conta"
            description="Se marcado, o saldo desta conta será exibido na visão mensal"
            checked={formData.trackBalance}
            onChange={(e) => setFormData({ ...formData, trackBalance: e.currentTarget.checked })}
          />
          <Button fullWidth onClick={handleSubmit} loading={loading}>
            Criar Conta
          </Button>
        </Stack>
      </Modal>

      {selectedAccount && (
        <BankAccountYieldModal
          controlId={controlId}
          bankAccountId={selectedAccount.id}
          bankAccountName={selectedAccount.name}
          opened={yieldModalOpened}
          onClose={() => {
            setYieldModalOpened(false);
            setSelectedAccount(null);
          }}
        />
      )}
    </div>
  );
}
