'use client';

import { useState, useEffect } from 'react';
import {
  Title,
  Paper,
  Table,
  Button,
  TextInput,
  Modal,
  Group,
  Select,
  ColorInput,
  Textarea,
  Badge,
  ActionIcon,
  Switch,
  Stack,
  Text,
  Skeleton,
} from '@mantine/core';
import { IconPlus, IconPencil, IconTrash, IconReceipt } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface Account {
  id: string;
  name: string;
  description: string | null;
  type: 'expense' | 'income';
  color: string | null;
  icon: string | null;
  isActive: boolean;
  createdAt: string;
}

interface AccountsProps {
  controlId: string;
}

export function Accounts({ controlId }: AccountsProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [color, setColor] = useState('#4CAF50');
  const [isActive, setIsActive] = useState(true);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/financial-controls/${controlId}/accounts`);
      const data = await response.json();

      if (response.ok) {
        setAccounts(data.accounts);
      } else {
        notifications.show({
          title: 'Erro',
          message: data.error || 'Erro ao carregar contas',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
      notifications.show({
        title: 'Erro',
        message: 'Erro ao carregar contas',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlId]);

  const openModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setName(account.name);
      setDescription(account.description || '');
      setType(account.type);
      setColor(account.color || '#4CAF50');
      setIsActive(account.isActive);
    } else {
      setEditingAccount(null);
      setName('');
      setDescription('');
      setType('expense');
      setColor('#4CAF50');
      setIsActive(true);
    }
    setModalOpened(true);
  };

  const closeModal = () => {
    setModalOpened(false);
    setEditingAccount(null);
    setName('');
    setDescription('');
    setType('expense');
    setColor('#4CAF50');
    setIsActive(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      notifications.show({
        title: 'Erro',
        message: 'Nome da conta é obrigatório',
        color: 'red',
      });
      return;
    }

    try {
      const url = editingAccount
        ? `/api/financial-controls/${controlId}/accounts/${editingAccount.id}`
        : `/api/financial-controls/${controlId}/accounts`;
      
      const method = editingAccount ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          type,
          color,
          isActive,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: editingAccount ? 'Conta atualizada com sucesso' : 'Conta criada com sucesso',
          color: 'green',
        });
        closeModal();
        loadAccounts();
      } else {
        notifications.show({
          title: 'Erro',
          message: data.error || 'Erro ao salvar conta',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
      notifications.show({
        title: 'Erro',
        message: 'Erro ao salvar conta',
        color: 'red',
      });
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta conta? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const response = await fetch(`/api/financial-controls/${controlId}/accounts/${accountId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Conta deletada com sucesso',
          color: 'green',
        });
        loadAccounts();
      } else {
        notifications.show({
          title: 'Erro',
          message: data.error || 'Erro ao deletar conta',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Erro ao deletar conta:', error);
      notifications.show({
        title: 'Erro',
        message: 'Erro ao deletar conta',
        color: 'red',
      });
    }
  };

  // Filtrar contas pela busca
  const filteredAccounts = accounts.filter((account) => {
    const query = searchQuery.toLowerCase();
    return (
      account.name.toLowerCase().includes(query) ||
      (account.description && account.description.toLowerCase().includes(query))
    );
  });

  return (
    <>
      <Paper p="md" mb="md">
        <Group justify="space-between" mb="md">
          <Title order={3}>Contas</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={() => openModal()}>
            Nova Conta
          </Button>
        </Group>
        
        <TextInput
          placeholder="Buscar por nome ou descrição..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </Paper>

      <Paper shadow="sm" p="md">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Descrição</Table.Th>
              <Table.Th>Tipo</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
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
                  <IconReceipt size={48} style={{ opacity: 0.3 }} />
                  <Text c="dimmed">
                    {searchQuery.trim() ? 'Nenhuma conta encontrada' : 'Nenhuma conta cadastrada ainda'}
                  </Text>
                  {!searchQuery.trim() && (
                    <Text size="sm" c="dimmed">
                      As contas servem para organizar suas despesas e receitas (ex: Luz, Água, Uber, Alimentação)
                    </Text>
                  )}
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredAccounts.map((account) => (
                <Table.Tr 
                  key={account.id}
                  onDoubleClick={() => openModal(account)}
                  style={{ cursor: 'pointer' }}
                >
                  <Table.Td>
                    <Group gap="xs">
                      {account.color && (
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            backgroundColor: account.color,
                          }}
                        />
                      )}
                      {account.name}
                    </Group>
                  </Table.Td>
                  <Table.Td>{account.description || '-'}</Table.Td>
                  <Table.Td>
                    <Badge color={account.type === 'expense' ? 'red' : 'green'} variant="light">
                      {account.type === 'expense' ? 'Despesa' : 'Receita'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={account.isActive ? 'green' : 'gray'} variant="light">
                      {account.isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => openModal(account)}
                      >
                        <IconPencil size={16} />
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
        onClose={closeModal}
        title={editingAccount ? 'Editar Conta' : 'Nova Conta'}
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Nome"
            placeholder="Ex: Luz, Água, Uber, Alimentação"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Textarea
            label="Descrição"
            placeholder="Descrição opcional da conta"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          <Select
            label="Tipo"
            required
            value={type}
            onChange={(value) => setType(value as 'expense' | 'income')}
            data={[
              { value: 'expense', label: 'Despesa' },
              { value: 'income', label: 'Receita' },
            ]}
          />

          <ColorInput
            label="Cor"
            placeholder="Escolha uma cor"
            value={color}
            onChange={setColor}
          />

          <Switch
            label="Conta ativa"
            checked={isActive}
            onChange={(e) => setIsActive(e.currentTarget.checked)}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={closeModal}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingAccount ? 'Salvar' : 'Criar'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
