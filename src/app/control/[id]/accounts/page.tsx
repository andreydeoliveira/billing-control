'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Container,
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
  Tooltip,
  Switch,
} from '@mantine/core';
import { IconPlus, IconPencil, IconTrash, IconReceipt, IconArrowLeft } from '@tabler/icons-react';
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

export default function AccountsPage() {
  const params = useParams();
  const router = useRouter();
  const controlId = params.id as string;
  
  console.log('AccountsPage - params:', params);
  console.log('AccountsPage - controlId:', controlId);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  
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
        message: 'Nome é obrigatório',
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
          name: name.trim(),
          description: description.trim() || null,
          type,
          color,
          isActive,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: data.message,
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
    if (!confirm('Tem certeza que deseja deletar esta conta?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/financial-controls/${controlId}/accounts/${accountId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: data.message,
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

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <Group gap="xs">
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={() => router.push(`/control/${controlId}`)}
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Title order={2}>
            <Group gap="xs">
              <IconReceipt size={32} />
              Contas
            </Group>
          </Title>
        </Group>
        <Button leftSection={<IconPlus size={16} />} onClick={() => openModal()}>
          Nova Conta
        </Button>
      </Group>

      <Paper shadow="sm" p="md">
        {loading ? (
          <div>Carregando...</div>
        ) : accounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            <IconReceipt size={48} style={{ opacity: 0.3 }} />
            <p>Nenhuma conta cadastrada ainda.</p>
            <p style={{ fontSize: '0.9rem' }}>
              As contas servem para organizar suas despesas e receitas (ex: Luz, Água, Uber, Alimentação)
            </p>
          </div>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Descrição</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th style={{ width: '120px' }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {accounts.map((account) => (
                <Table.Tr key={account.id} opacity={account.isActive ? 1 : 0.5}>
                  <Table.Td>
                    <Group gap="xs">
                      {account.color && (
                        <div
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: 4,
                            backgroundColor: account.color,
                          }}
                        />
                      )}
                      <span style={{ fontWeight: 500 }}>{account.name}</span>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <span style={{ fontSize: '0.9rem', color: '#666' }}>
                      {account.description || '-'}
                    </span>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={account.type === 'expense' ? 'red' : 'green'}>
                      {account.type === 'expense' ? 'Despesa' : 'Receita'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={account.isActive ? 'blue' : 'gray'}>
                      {account.isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Editar">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => openModal(account)}
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Deletar">
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={() => handleDelete(account.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={editingAccount ? 'Editar Conta' : 'Nova Conta'}
        size="md"
      >
        <TextInput
          label="Nome"
          placeholder="Ex: Luz, Água, Internet, Uber"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          required
          mb="md"
        />

        <Textarea
          label="Descrição"
          placeholder="Descrição opcional"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          mb="md"
          rows={3}
        />

        <Select
          label="Tipo"
          value={type}
          onChange={(value) => setType(value as 'expense' | 'income')}
          data={[
            { value: 'expense', label: 'Despesa' },
            { value: 'income', label: 'Receita' },
          ]}
          required
          mb="md"
        />

        <ColorInput
          label="Cor"
          placeholder="Escolha uma cor"
          value={color}
          onChange={setColor}
          mb="md"
        />

        <Switch
          label="Conta ativa"
          checked={isActive}
          onChange={(e) => setIsActive(e.currentTarget.checked)}
          mb="xl"
        />

        <Group justify="flex-end">
          <Button variant="light" onClick={closeModal}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {editingAccount ? 'Salvar' : 'Criar'}
          </Button>
        </Group>
      </Modal>
    </Container>
  );
}
