'use client';

import { useState, useEffect } from 'react';
import {
  Paper,
  Title,
  Text,
  Button,
  Table,
  ActionIcon,
  Modal,
  Stack,
  TextInput,
  NumberInput,
  Group,
  Skeleton,
} from '@mantine/core';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface Card {
  id: string;
  name: string;
  closingDay: string | null;
  dueDay: string | null;
  createdAt: string;
}

interface CardsProps {
  controlId: string;
}

export function Cards({ controlId }: CardsProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [filteredCards, setFilteredCards] = useState<Card[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpened, setModalOpened] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    closingDay: '',
    dueDay: '',
  });

  const loadCards = async () => {
    setPageLoading(true);
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/cards`);
      if (response.ok) {
        const data = await response.json();
        setCards(data);
        setFilteredCards(data);
      }
    } catch (error) {
      console.error('Erro ao carregar cartões:', error);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlId]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCards(cards);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = cards.filter((card) =>
        card.name.toLowerCase().includes(query)
      );
      setFilteredCards(filtered);
    }
  }, [searchQuery, cards]);

  const handleSubmit = async () => {
    if (!formData.name) {
      notifications.show({
        title: 'Erro',
        message: 'Preencha o nome do cartão',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const url = `/api/financial-controls/${controlId}/cards`;
      const method = editingCard ? 'PUT' : 'POST';

      const body = editingCard
        ? {
            id: editingCard.id,
            name: formData.name,
            closingDay: formData.closingDay || null,
            dueDay: formData.dueDay || null,
          }
        : {
            name: formData.name,
            closingDay: formData.closingDay || null,
            dueDay: formData.dueDay || null,
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: editingCard ? 'Cartão atualizado!' : 'Cartão criado!',
          color: 'green',
        });
        setModalOpened(false);
        setEditingCard(null);
        setFormData({ name: '', closingDay: '', dueDay: '' });
        loadCards();
      } else {
        const errorData = await response.json();
        console.error('Erro ao salvar cartão:', errorData);
        throw new Error(errorData.error || 'Erro ao salvar cartão');
      }
    } catch (error) {
      console.error('Erro ao salvar cartão:', error);
      notifications.show({
        title: 'Erro',
        message: editingCard ? 'Não foi possível atualizar o cartão' : 'Não foi possível criar o cartão',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (card: Card) => {
    setEditingCard(card);
    setFormData({
      name: card.name,
      closingDay: card.closingDay || '',
      dueDay: card.dueDay || '',
    });
    setModalOpened(true);
  };

  const openCreateModal = () => {
    setEditingCard(null);
    setFormData({ name: '', closingDay: '', dueDay: '' });
    setModalOpened(true);
  };

  const handleDelete = async (cardId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cartão? Todas as transações vinculadas serão desvinculadas.')) {
      return;
    }

    setPageLoading(true);
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/cards/${cardId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Cartão excluído com sucesso',
          color: 'green',
        });
        loadCards();
      } else {
        throw new Error('Erro ao excluir cartão');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível excluir o cartão',
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
          <Title order={2}>Cartões</Title>
          <Text c="dimmed" size="sm">
            Gerencie seus cartões
          </Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
          Novo Cartão
        </Button>
      </Group>

      <Paper shadow="xs" p="md">
        <TextInput
          placeholder="Buscar por nome..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          mb="md"
        />

        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Dia Fechamento</Table.Th>
              <Table.Th>Dia Vencimento</Table.Th>
              <Table.Th style={{ width: 100 }}>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pageLoading ? (
              // Loading skeleton
              Array(3).fill(0).map((_, index) => (
                <Table.Tr key={`skeleton-${index}`}>
                  <Table.Td><Skeleton height={20} width="70%" /></Table.Td>
                  <Table.Td><Skeleton height={20} width="30%" /></Table.Td>
                  <Table.Td><Skeleton height={20} width="30%" /></Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Skeleton height={30} width={30} circle />
                      <Skeleton height={30} width={30} circle />
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            ) : filteredCards.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4} style={{ textAlign: 'center', padding: 32 }}>
                  <Text c="dimmed">
                    {searchQuery.trim() ? 'Nenhum cartão encontrado' : 'Nenhum cartão cadastrado'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredCards.map((card) => (
                <Table.Tr 
                  key={card.id}
                  onDoubleClick={() => openEditModal(card)}
                  style={{ cursor: 'pointer' }}
                >
                  <Table.Td>{card.name}</Table.Td>
                  <Table.Td>{card.closingDay || '-'}</Table.Td>
                  <Table.Td>{card.dueDay || '-'}</Table.Td>
                  <Table.Td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <ActionIcon 
                        variant="subtle" 
                        color="blue"
                        onClick={() => openEditModal(card)}
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon 
                        variant="subtle" 
                        color="red"
                        onClick={() => handleDelete(card.id)}
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
          setEditingCard(null);
        }}
        title={editingCard ? 'Editar Cartão' : 'Novo Cartão'}
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Nome do Cartão"
            placeholder="Ex: Nubank, Inter, C6"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <NumberInput
            label="Dia de Fechamento (Opcional)"
            placeholder="Ex: 10"
            value={formData.closingDay}
            onChange={(value) => setFormData({ ...formData, closingDay: String(value) })}
            min={1}
            max={31}
          />
          <NumberInput
            label="Dia de Vencimento (Opcional)"
            placeholder="Ex: 20"
            value={formData.dueDay}
            onChange={(value) => setFormData({ ...formData, dueDay: String(value) })}
            min={1}
            max={31}
          />
          <Button fullWidth onClick={handleSubmit} loading={loading}>
            Criar Cartão
          </Button>
        </Stack>
      </Modal>
    </div>
  );
}
