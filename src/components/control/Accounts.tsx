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
  Textarea,
  Badge,
  ActionIcon,
  Switch,
  Stack,
  Text,
  Skeleton,
  Tabs,
} from '@mantine/core';
import { IconPlus, IconPencil, IconTrash, IconReceipt, IconTags } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface Account {
  id: string;
  name: string;
  description: string | null;
  type: 'expense' | 'income';
  icon: string | null;
  isActive: boolean;
  classificationId: string | null;
  createdAt: string;
}

interface Classification {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

interface AccountsProps {
  controlId: string;
}

export function Accounts({ controlId }: AccountsProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [classifications, setClassifications] = useState<Classification[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, setModalOpened] = useState(false);
  const [classificationModalOpened, setClassificationModalOpened] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editingClassification, setEditingClassification] = useState<Classification | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('accounts');
  
  // Form state para contas
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [classificationId, setClassificationId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);

  // Form state para classificações
  const [classificationName, setClassificationName] = useState('');
  const [classificationDescription, setClassificationDescription] = useState('');

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

  const loadClassifications = async () => {
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/classifications`);
      const data = await response.json();

      if (response.ok) {
        setClassifications(data);
      } else {
        notifications.show({
          title: 'Erro',
          message: 'Erro ao carregar classificações',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar classificações:', error);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadClassifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlId]);

  const openModal = (account?: Account) => {
    if (account) {
      setEditingAccount(account);
      setName(account.name);
      setDescription(account.description || '');
      setType(account.type);
      setClassificationId(account.classificationId);
      setIsActive(account.isActive);
    } else {
      setEditingAccount(null);
      setName('');
      setDescription('');
      setType('expense');
      setClassificationId(null);
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
    setClassificationId(null);
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
          classificationId: classificationId || null,
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

  // Fun\u00e7\u00f5es de classifica\u00e7\u00e3o
  const openClassificationModal = (classification?: Classification) => {
    if (classification) {
      setEditingClassification(classification);
      setClassificationName(classification.name);
      setClassificationDescription(classification.description || '');
    } else {
      setEditingClassification(null);
      setClassificationName('');
      setClassificationDescription('');
    }
    setClassificationModalOpened(true);
  };

  const closeClassificationModal = () => {
    setClassificationModalOpened(false);
    setEditingClassification(null);
    setClassificationName('');
    setClassificationDescription('');
  };

  const handleClassificationSubmit = async () => {
    if (!classificationName.trim()) {
      notifications.show({
        title: 'Erro',
        message: 'Nome da classifica\u00e7\u00e3o \u00e9 obrigat\u00f3rio',
        color: 'red',
      });
      return;
    }

    try {
      const url = editingClassification
        ? `/api/financial-controls/${controlId}/classifications/${editingClassification.id}`
        : `/api/financial-controls/${controlId}/classifications`;
      
      const method = editingClassification ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: classificationName,
          description: classificationDescription || null,
          isActive: true,
        }),
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: editingClassification ? 'Classifica\u00e7\u00e3o atualizada' : 'Classifica\u00e7\u00e3o criada',
          color: 'green',
        });
        closeClassificationModal();
        loadClassifications();
      } else {
        const data = await response.json();
        notifications.show({
          title: 'Erro',
          message: data.error || 'Erro ao salvar classifica\u00e7\u00e3o',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Erro ao salvar classifica\u00e7\u00e3o:', error);
      notifications.show({
        title: 'Erro',
        message: 'Erro ao salvar classifica\u00e7\u00e3o',
        color: 'red',
      });
    }
  };

  const handleDeleteClassification = async (classificationId: string) => {
    if (!confirm('Tem certeza? As contas com esta classifica\u00e7\u00e3o ficar\u00e3o sem classifica\u00e7\u00e3o.')) {
      return;
    }

    try {
      const response = await fetch(`/api/financial-controls/${controlId}/classifications/${classificationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Classifica\u00e7\u00e3o exclu\u00edda',
          color: 'green',
        });
        loadClassifications();
        loadAccounts(); // Recarregar contas pois podem ter sido afetadas
      } else {
        notifications.show({
          title: 'Erro',
          message: 'Erro ao excluir classifica\u00e7\u00e3o',
          color: 'red',
        });
      }
    } catch (error) {
      console.error('Erro ao excluir classifica\u00e7\u00e3o:', error);
      notifications.show({
        title: 'Erro',
        message: 'Erro ao excluir classifica\u00e7\u00e3o',
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
        <Title order={3} mb="md">Gerenciamento de Contas</Title>
        
        <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'accounts')}>
          <Tabs.List>
            <Tabs.Tab value="accounts" leftSection={<IconReceipt size={16} />}>
              Contas
            </Tabs.Tab>
            <Tabs.Tab value="classifications" leftSection={<IconTags size={16} />}>
              Classificações
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="accounts" pt="md">
            <Group justify="space-between" mb="md">
              <TextInput
                placeholder="Buscar por nome ou descrição..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1, maxWidth: 400 }}
              />
              <Button leftSection={<IconPlus size={16} />} onClick={() => openModal()}>
                Nova Conta
              </Button>
            </Group>

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
                    {account.name}
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
          </Tabs.Panel>

          <Tabs.Panel value="classifications" pt="md">
            <Group justify="space-between" mb="md">
              <Text size="sm" c="dimmed">
                Classifique suas contas por categoria (ex: Moradia, Transporte, Alimentação)
              </Text>
              <Button leftSection={<IconPlus size={16} />} onClick={() => openClassificationModal()}>
                Nova Classificação
              </Button>
            </Group>

            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Nome</Table.Th>
                  <Table.Th>Descrição</Table.Th>
                  <Table.Th style={{ width: '120px' }}>Ações</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {classifications.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={3} style={{ textAlign: 'center', padding: 32 }}>
                      <IconTags size={48} style={{ opacity: 0.3 }} />
                      <Text c="dimmed">Nenhuma classificação cadastrada ainda</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  classifications.map((classification) => (
                    <Table.Tr key={classification.id}>
                      <Table.Td>{classification.name}</Table.Td>
                      <Table.Td>{classification.description || '-'}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() => openClassificationModal(classification)}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => handleDeleteClassification(classification.id)}
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
          </Tabs.Panel>
        </Tabs>
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

          <Select
            label="Classificação"
            placeholder="Selecione uma classificação (opcional)"
            value={classificationId}
            onChange={setClassificationId}
            data={[
              { value: '', label: 'Sem classificação' },
              ...classifications.map(c => ({ value: c.id, label: c.name }))
            ]}
            clearable
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

      <Modal
        opened={classificationModalOpened}
        onClose={closeClassificationModal}
        title={editingClassification ? 'Editar Classificação' : 'Nova Classificação'}
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Nome"
            placeholder="Ex: Moradia, Transporte, Alimentação"
            required
            value={classificationName}
            onChange={(e) => setClassificationName(e.target.value)}
          />

          <Textarea
            label="Descrição"
            placeholder="Descrição opcional"
            value={classificationDescription}
            onChange={(e) => setClassificationDescription(e.target.value)}
            rows={3}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={closeClassificationModal}>
              Cancelar
            </Button>
            <Button onClick={handleClassificationSubmit}>
              {editingClassification ? 'Salvar' : 'Criar'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
