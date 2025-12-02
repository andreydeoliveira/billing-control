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
import { IconPlus, IconEdit, IconTrash, IconBox } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
  initialBalance?: string;
  isActive: boolean;
  createdAt: string;
}

interface BankAccountsProps {
  controlId: string;
  onOpenBoxes?: (bankAccountId: string) => void;
}

export function BankAccounts({ controlId, onOpenBoxes }: BankAccountsProps) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<BankAccount[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    bankName: '',
    initialBalance: '',
  });
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Projeções futuras removidas conforme solicitação: manter somente saldo atual

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const loadBalances = async () => {
    try {
      const response = await fetch(
        `/api/financial-controls/${controlId}/account-balances?month=${currentMonth}`,
        { cache: 'no-store' }
      );
      if (response.ok) {
        const data = await response.json();
        const map: Record<string, number> = {};
        (data as any[]).forEach((b) => { map[b.accountId] = b.finalBalance; });
        setBalances(map);
      }
    } catch (e) {
      console.error('Erro ao carregar saldos de contas bancárias:', e);
    }
  };
  // Inline boxes management removed; use full-screen Boxes view instead

  const loadAccounts = async () => {
    setPageLoading(true);
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/bank-accounts`, { cache: 'no-store' });
      console.log('[BankAccounts] fetch status:', response.status);
      const data = await response.json().catch(() => null);
      console.log('[BankAccounts] payload:', data);
      if (response.ok && Array.isArray(data)) {
        setAccounts(data);
        setFilteredAccounts(data);
        errorMessage && setErrorMessage(null);
        try { (window as any).__debugBankAccounts = data; } catch {}
        loadBalances();
      } else {
        setAccounts([]);
        setFilteredAccounts([]);
        setErrorMessage(data?.error || 'Falha ao carregar contas bancárias');
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      setErrorMessage('Erro de rede ao buscar contas bancárias');
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
      setFilteredAccounts(showInactive ? accounts : accounts.filter(a => a.isActive));
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = accounts.filter(
        (account) =>
          (account.name.toLowerCase().includes(query) ||
          account.bankName.toLowerCase().includes(query)) &&
          (showInactive || account.isActive)
      );
      setFilteredAccounts(filtered);
    }
  }, [searchQuery, accounts, showInactive]);

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
            initialBalance: formData.initialBalance || '0',
          }
        : {
            name: formData.name,
            bankName: formData.bankName,
            initialBalance: formData.initialBalance || '0',
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
        setFormData({ name: '', bankName: '', initialBalance: '' });
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
    });
    setModalOpened(true);
  };

  const openCreateModal = () => {
    setEditingAccount(null);
    setFormData({ name: '', bankName: '', initialBalance: '' });
    setModalOpened(true);
  };

  const handleToggleActive = async (account: BankAccount) => {
    const action = account.isActive ? 'inativar' : 'reativar';
    if (!confirm(`Tem certeza que deseja ${action} esta conta?`)) {
      return;
    }

    setPageLoading(true);
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/bank-accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !account.isActive }),
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: `Conta ${account.isActive ? 'inativada' : 'reativada'} com sucesso`,
          color: 'green',
        });
        loadAccounts();
      } else {
        throw new Error('Erro ao atualizar conta');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível atualizar a conta',
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
        <Button variant="light" onClick={loadAccounts}>
          Recarregar
        </Button>
      </Group>

      <Paper shadow="xs" p="md">
        <Group mb="md" justify="space-between">
          <TextInput
            placeholder="Buscar por nome ou banco..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <Checkbox
            label="Mostrar inativas"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.currentTarget.checked)}
          />
        </Group>

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome da Conta</Table.Th>
              <Table.Th>Banco</Table.Th>
              <Table.Th>Saldo Inicial</Table.Th>
              <Table.Th>Saldo</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th style={{ width: 100 }}>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pageLoading ? (
              // Loading skeleton
              Array(3).fill(0).map((_, index) => (
                <Table.Tr key={`skeleton-${index}`}>
                  <Table.Td><Skeleton height={20} width="80%" /></Table.Td>
                  <Table.Td><Skeleton height={20} width="60%" /></Table.Td>
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
                <Table.Td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>
                  {errorMessage ? (
                    <Text c="red" fw={500}>{errorMessage}</Text>
                  ) : (
                    <>
                      <Text c="dimmed">
                        {searchQuery ? 'Nenhuma conta encontrada' : 'Nenhuma conta bancária cadastrada'}
                      </Text>
                      {accounts.length > 0 && accounts.every(a => !a.isActive) && (
                        <Text size="sm" c="orange" mt={6}>
                          Todas as contas estão inativas. Marque "Mostrar inativas" para visualizá-las.
                        </Text>
                      )}
                    </>
                  )}
                  {(!errorMessage && accounts.length === 0) && (
                    <Text size="xs" c="dimmed" mt={4}>
                      Cadastre uma conta bancária clicando em "Nova Conta". Se você já cadastrou e continua vazio, verifique se está autenticado e recarregue a página.
                    </Text>
                  )}
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredAccounts.map((account) => (
                <Table.Tr 
                  key={account.id}
                  onDoubleClick={() => {
                    // Padrão: duplo clique abre edição da conta
                    openEditModal(account);
                  }}
                  style={{ cursor: 'pointer', opacity: account.isActive ? 1 : 0.6 }}
                >
                  <Table.Td>{account.name}</Table.Td>
                  <Table.Td>{account.bankName}</Table.Td>
                  <Table.Td>
                    {account.initialBalance != null
                      ? Number(account.initialBalance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : 'R$ 0,00'}
                  </Table.Td>
                  <Table.Td>{balances[account.id] != null ? balances[account.id].toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '...'}</Table.Td>
                  <Table.Td>
                    <Badge color={account.isActive ? 'green' : 'gray'} size="sm">
                      {account.isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {onOpenBoxes && (
                        <ActionIcon
                          variant="subtle"
                          color="teal"
                          title="Abrir Caixinhas"
                          onClick={() => onOpenBoxes(account.id)}
                        >
                          <IconBox size={16} />
                        </ActionIcon>
                      )}
                      <ActionIcon 
                        variant="subtle" 
                        color="blue"
                        onClick={() => openEditModal(account)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      {/* Caixinhas acessadas via tela completa ao dar duplo clique na conta */}
                      <ActionIcon 
                        variant="subtle" 
                        color={account.isActive ? 'red' : 'green'}
                        onClick={() => handleToggleActive(account)}
                        title={account.isActive ? 'Inativar' : 'Reativar'}
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
            label="Saldo Inicial"
            placeholder="0.00"
            value={formData.initialBalance}
            onChange={(value) => setFormData({ ...formData, initialBalance: String(value) })}
            prefix="R$ "
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator="."
            decimalSeparator=","
          />

          {/* Caixinhas não são mais gerenciadas inline aqui */}
          <Button fullWidth onClick={handleSubmit} loading={loading}>
            {editingAccount ? 'Salvar' : 'Criar Conta'}
          </Button>
        </Stack>
      </Modal>

      {/* Caixinhas inline modal removido; usar tela completa */}
    </div>
  );
}
