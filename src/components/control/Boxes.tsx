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
  ActionIcon,
  Group,
  Badge,
  Skeleton,
  Select,
  NumberInput,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconPlus, IconEdit, IconTrash, IconArrowRight, IconTrendingUp } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface BankAccount {
  id: string;
  name: string;
  bankName: string;
}

interface Box {
  id: string;
  name: string;
  currentBalance: string;
  isActive: boolean;
  bankAccountId: string;
  bankAccountName: string;
  bankName: string;
  createdAt: string;
}

interface BoxesProps {
  controlId: string;
  filterBankAccountId?: string;
  onBack?: () => void;
}

export function Boxes({ controlId, filterBankAccountId, onBack }: BoxesProps) {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [incomeAccounts, setIncomeAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [filteredBoxes, setFilteredBoxes] = useState<Box[]>([]);
  const [showInactive, setShowInactive] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const [transferModalOpened, setTransferModalOpened] = useState(false);
  const [yieldModalOpened, setYieldModalOpened] = useState(false);
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [editingBox, setEditingBox] = useState<Box | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    bankAccountId: '',
    initialAmount: '',
  });
  const [transferData, setTransferData] = useState({
    toBoxId: '',
    amount: '',
    description: '',
  });
  const [yieldData, setYieldData] = useState({
    accountId: '',
    mode: 'period' as 'period' | 'historic',
    amount: '',
    currentTotal: '',
    previousTotal: '',
    date: new Date(),
    description: '',
  });

  const loadBoxes = async () => {
    setPageLoading(true);
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/boxes`);
      if (response.ok) {
        const data = await response.json();
        const filtered = filterBankAccountId ? data.filter((b: Box) => b.bankAccountId === filterBankAccountId) : data;
        setBoxes(filtered);
      }
    } catch (error) {
      console.error('Erro ao carregar caixinhas:', error);
    } finally {
      setPageLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const [bankRes, accRes] = await Promise.all([
        fetch(`/api/financial-controls/${controlId}/bank-accounts`),
        fetch(`/api/financial-controls/${controlId}/expense-income-accounts`),
      ]);

      if (bankRes.ok) {
        const data = await bankRes.json();
        const filtered = (data as Array<BankAccount & { isActive: boolean }>)
          .filter(acc => acc.isActive);
        // Remover duplicados por id
        const unique = Array.from(new Map(filtered.map(acc => [acc.id, acc])).values());
        setAccounts(unique);
      }

      if (accRes.ok) {
        const accData = await accRes.json();
        const incomes = (accData as Array<{ id: string; name: string; type: string }>).
          filter((a) => a.type === 'income').
          map((a) => ({ id: a.id, name: a.name }));
        setIncomeAccounts(incomes);
      }
    } catch (error) {
      console.error('Erro ao carregar contas:', error);
    }
  };

  useEffect(() => {
    loadBoxes();
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlId]);

  useEffect(() => {
    setFilteredBoxes(showInactive ? boxes : boxes.filter(b => b.isActive));
  }, [showInactive, boxes]);

  const handleSubmit = async () => {
    if (!formData.name || (!filterBankAccountId && !formData.bankAccountId)) {
      notifications.show({
        title: 'Erro',
        message: 'Preencha o nome e selecione a conta bancária',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const url = `/api/financial-controls/${controlId}/boxes`;
      const method = editingBox ? 'PUT' : 'POST';

      const body = editingBox
        ? {
            id: editingBox.id,
            name: formData.name,
          }
        : {
            name: formData.name,
            bankAccountId: filterBankAccountId || formData.bankAccountId,
          };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: editingBox ? 'Caixinha atualizada!' : 'Caixinha criada!',
          color: 'green',
        });
        setModalOpened(false);
        setEditingBox(null);
        setFormData({ name: '', bankAccountId: filterBankAccountId || '', initialAmount: '' });
        loadBoxes();
      } else {
        throw new Error('Erro ao salvar caixinha');
      }
    } catch (error) {
      console.error('Erro ao salvar caixinha:', error);
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível salvar a caixinha',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (box: Box) => {
    setEditingBox(box);
    setFormData({
      name: box.name,
      bankAccountId: box.bankAccountId,
      initialAmount: '',
    });
    setModalOpened(true);
  };

  const openCreateModal = () => {
    setEditingBox(null);
    setFormData({ name: '', bankAccountId: filterBankAccountId || '', initialAmount: '' });
    setModalOpened(true);
  };

  const handleToggleActive = async (box: Box) => {
    const action = box.isActive ? 'inativar' : 'reativar';
    if (!confirm(`Tem certeza que deseja ${action} esta caixinha?`)) {
      return;
    }

    setPageLoading(true);
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/boxes/${box.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !box.isActive }),
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: `Caixinha ${box.isActive ? 'inativada' : 'reativada'} com sucesso`,
          color: 'green',
        });
        loadBoxes();
      } else {
        throw new Error('Erro ao atualizar caixinha');
      }
    } catch {
      notifications.show({
        title: 'Erro',
        message: 'Não foi possível atualizar a caixinha',
        color: 'red',
      });
    } finally {
      setPageLoading(false);
    }
  };

  const openTransferModal = (box: Box) => {
    setSelectedBox(box);
    setTransferData({ toBoxId: '', amount: '', description: '' });
    setTransferModalOpened(true);
  };

  const openYieldModal = (box: Box) => {
    setSelectedBox(box);
    setYieldData({
      accountId: incomeAccounts[0]?.id || '',
      mode: 'period',
      amount: '',
      currentTotal: '',
      previousTotal: '',
      date: new Date(),
      description: '',
    });
    setYieldModalOpened(true);
  };

  const handleTransfer = async () => {
    if (!selectedBox || !transferData.toBoxId || !transferData.amount) {
      notifications.show({
        title: 'Erro',
        message: 'Preencha todos os campos',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/financial-controls/${controlId}/boxes/${selectedBox.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferData),
      });

      if (response.ok) {
        notifications.show({
          title: 'Sucesso',
          message: 'Transferência realizada!',
          color: 'green',
        });
        setTransferModalOpened(false);
        setSelectedBox(null);
        setTransferData({ toBoxId: '', amount: '', description: '' });
        loadBoxes();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao transferir');
      }
    } catch (error: unknown) {
      console.error('Erro ao transferir:', error);
      notifications.show({
        title: 'Erro',
        message: error instanceof Error ? error.message : 'Não foi possível realizar a transferência',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const getAvailableBoxesForTransfer = () => {
    if (!selectedBox) return [];
    return boxes.filter(
      (b) => b.id !== selectedBox.id && b.bankAccountId === selectedBox.bankAccountId && b.isActive
    );
  };

  const handleRegisterYield = async () => {
    if (!selectedBox) return;

    // calcular valor com base no modo
    let value = 0;
    if (yieldData.mode === 'period') {
      value = parseFloat(yieldData.amount || '0');
    } else {
      const curr = parseFloat(yieldData.currentTotal || '0');
      const prev = parseFloat(yieldData.previousTotal || '0');
      value = curr - prev;
    }

    if (!yieldData.accountId || !isFinite(value) || value <= 0) {
      notifications.show({ title: 'Erro', message: 'Informe conta de receita e valor válido', color: 'red' });
      return;
    }

    setLoading(true);
    try {
      // montar payload para monthly-transactions
      const monthYear = `${yieldData.date.getFullYear()}-${String(yieldData.date.getMonth() + 1).padStart(2, '0')}`;
      const response = await fetch(`/api/financial-controls/${controlId}/monthly-transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: yieldData.accountId,
          expectedAmount: String(value),
          actualAmount: String(value),
          paymentMethod: 'bank_account',
          bankAccountId: selectedBox.bankAccountId,
          cardId: '',
          monthYear,
          paidDate: yieldData.date,
          observation: yieldData.description,
          boxId: selectedBox.id,
        }),
      });

      if (response.ok) {
        notifications.show({ title: 'Sucesso', message: 'Rendimento registrado na caixinha', color: 'green' });
        setYieldModalOpened(false);
        setSelectedBox(null);
        await loadBoxes();
      } else {
        const text = await response.text();
        notifications.show({ title: 'Erro', message: text || 'Falha ao registrar rendimento', color: 'red' });
      }
    } catch (e) {
      notifications.show({ title: 'Erro', message: 'Falha de conexão ao registrar rendimento', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={2}>Caixinhas</Title>
          <Text c="dimmed" size="sm">
            Gerencie suas caixinhas e rendimento
          </Text>
        </div>
        <Group gap="xs">
          {onBack && <Button variant="default" onClick={onBack}>Voltar</Button>}
          <Button leftSection={<IconPlus size={16} />} onClick={openCreateModal}>
            Nova Caixinha
          </Button>
        </Group>
      </Group>

      <Paper shadow="xs" p="md">
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Caixinha</Table.Th>
              <Table.Th>Conta Bancária</Table.Th>
              <Table.Th>Saldo Atual</Table.Th>
              {/* Meta e progresso removidos */}
              <Table.Th>Status</Table.Th>
              <Table.Th style={{ width: 150 }}>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {pageLoading ? (
              Array(3).fill(0).map((_, index) => (
                <Table.Tr key={`skeleton-${index}`}>
                  <Table.Td><Skeleton height={20} width="80%" /></Table.Td>
                  <Table.Td><Skeleton height={20} width="60%" /></Table.Td>
                  <Table.Td><Skeleton height={20} width="50%" /></Table.Td>
                  <Table.Td><Skeleton height={20} width="50%" /></Table.Td>
                  <Table.Td><Skeleton height={20} width="100%" /></Table.Td>
                  <Table.Td><Skeleton height={20} width="40%" /></Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Skeleton height={30} width={30} circle />
                      <Skeleton height={30} width={30} circle />
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            ) : filteredBoxes.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={7} style={{ textAlign: 'center', padding: 32 }}>
                  <Text c="dimmed">
                    {showInactive ? 'Nenhuma caixinha encontrada' : 'Nenhuma caixinha cadastrada'}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredBoxes.map((box) => {
                const balance = parseFloat(box.currentBalance);
                // Meta removida

                return (
                  <Table.Tr 
                    key={box.id}
                    onDoubleClick={() => openEditModal(box)}
                    style={{ cursor: 'pointer', opacity: box.isActive ? 1 : 0.6 }}
                  >
                    <Table.Td>
                      <Group gap="xs">
                        <Text>{box.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Text size="sm">{box.bankAccountName}</Text>
                        <Text size="xs" c="dimmed">{box.bankName}</Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500} c={balance >= 0 ? 'green' : 'red'}>
                        R$ {balance.toFixed(2)}
                      </Text>
                    </Table.Td>
                    {/* Colunas de meta e progresso removidas */}
                    <Table.Td>
                      <Badge color={box.isActive ? 'green' : 'gray'} size="sm">
                        {box.isActive ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <ActionIcon 
                          variant="subtle" 
                          color="violet"
                          onClick={() => openTransferModal(box)}
                          title="Transferir"
                          disabled={!box.isActive}
                        >
                          <IconArrowRight size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="teal"
                          onClick={() => openYieldModal(box)}
                          title="Registrar rendimento"
                          disabled={!box.isActive}
                        >
                          <IconTrendingUp size={16} />
                        </ActionIcon>
                        <ActionIcon 
                          variant="subtle" 
                          color="blue"
                          onClick={() => openEditModal(box)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon 
                          variant="subtle" 
                          color={box.isActive ? 'red' : 'green'}
                          onClick={() => handleToggleActive(box)}
                          title={box.isActive ? 'Inativar' : 'Reativar'}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </div>
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Modal de Criar/Editar */}
      <Modal
        opened={modalOpened}
        onClose={() => {
          setModalOpened(false);
          setEditingBox(null);
        }}
        title={editingBox ? 'Editar Caixinha' : 'Nova Caixinha'}
        size="md"
      >
        <Stack gap="md">
          <TextInput
            label="Nome da Caixinha"
            placeholder="Ex: Reserva Emergência, Viagem"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          {!filterBankAccountId && (
            <Select
              label="Conta Bancária"
              placeholder="Selecione a conta"
              data={accounts.map((acc) => ({
                value: acc.id,
                label: `${acc.name} - ${acc.bankName}`,
              }))}
              value={formData.bankAccountId}
              onChange={(value) => setFormData({ ...formData, bankAccountId: value || '' })}
              disabled={!!editingBox}
              required
            />
          )}
          {/* Campo de cor removido */}
          {/* Campo de meta removido */}
          {!editingBox && (
            <NumberInput
              label="Valor inicial (opcional)"
              placeholder="0.00"
              value={formData.initialAmount}
              onChange={(value) => setFormData({ ...formData, initialAmount: String(value) })}
              prefix="R$ "
              decimalScale={2}
              fixedDecimalScale
              thousandSeparator="."
              decimalSeparator="," 
            />
          )}
          <Button fullWidth onClick={handleSubmit} loading={loading}>
            {editingBox ? 'Salvar' : 'Criar Caixinha'}
          </Button>
        </Stack>
      </Modal>

      {/* Modal de Transferência */}
      <Modal
        opened={transferModalOpened}
        onClose={() => {
          setTransferModalOpened(false);
          setSelectedBox(null);
        }}
        title={`Transferir de: ${selectedBox?.name}`}
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Saldo atual: <Text span fw={500} c="blue">R$ {parseFloat(selectedBox?.currentBalance || '0').toFixed(2)}</Text>
          </Text>
          <Select
            label="Para Caixinha"
            placeholder="Selecione a caixinha de destino"
            data={getAvailableBoxesForTransfer().map((box) => ({
              value: box.id,
              label: box.name,
            }))}
            value={transferData.toBoxId}
            onChange={(value) => setTransferData({ ...transferData, toBoxId: value || '' })}
            required
          />
          <NumberInput
            label="Valor"
            placeholder="0.00"
            value={transferData.amount}
            onChange={(value) => setTransferData({ ...transferData, amount: String(value) })}
            prefix="R$ "
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator="."
            decimalSeparator=","
            required
          />
          <TextInput
            label="Descrição (Opcional)"
            placeholder="Ex: Guardando para viagem"
            value={transferData.description}
            onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
          />
          <Button fullWidth onClick={handleTransfer} loading={loading}>
            Transferir
          </Button>
        </Stack>
      </Modal>

      {/* Modal de Rendimento */}
      <Modal
        opened={yieldModalOpened}
        onClose={() => {
          setYieldModalOpened(false);
          setSelectedBox(null);
        }}
        title={`Rendimento em: ${selectedBox?.name}`}
        size="md"
      >
        <Stack gap="md">
          <Select
            label="Conta de Receita"
            placeholder="Selecione (ex: Rendimento CDI)"
            data={incomeAccounts.map((a) => ({ value: a.id, label: a.name }))}
            value={yieldData.accountId}
            onChange={(v) => setYieldData({ ...yieldData, accountId: v || '' })}
            required
          />

          <Select
            label="Modo"
            data={[
              { value: 'period', label: 'Valor do período' },
              { value: 'historic', label: 'Total histórico (calcular delta)' },
            ]}
            value={yieldData.mode}
            onChange={(v) => setYieldData({ ...yieldData, mode: (v as 'period' | 'historic') || 'period' })}
          />

          {yieldData.mode === 'period' ? (
            <NumberInput
              label="Valor do rendimento"
              placeholder="0.00"
              value={yieldData.amount}
              onChange={(val) => setYieldData({ ...yieldData, amount: String(val) })}
              prefix="R$ "
              decimalScale={2}
              fixedDecimalScale
              thousandSeparator="."
              decimalSeparator="," 
              required
            />
          ) : (
            <Group grow>
              <NumberInput
                label="Total histórico atual"
                placeholder="0.00"
                value={yieldData.currentTotal}
                onChange={(val) => setYieldData({ ...yieldData, currentTotal: String(val) })}
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale
                thousandSeparator="."
                decimalSeparator="," 
                required
              />
              <NumberInput
                label="Total histórico anterior"
                placeholder="0.00"
                value={yieldData.previousTotal}
                onChange={(val) => setYieldData({ ...yieldData, previousTotal: String(val) })}
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale
                thousandSeparator="."
                decimalSeparator="," 
                required
              />
            </Group>
          )}

          <DateInput
            label="Data do crédito"
            value={yieldData.date}
            onChange={(d) => setYieldData({ ...yieldData, date: d || new Date() })}
            valueFormat="DD/MM/YYYY"
          />

          <TextInput
            label="Descrição (Opcional)"
            placeholder="Ex: Rendimento diário"
            value={yieldData.description}
            onChange={(e) => setYieldData({ ...yieldData, description: e.target.value })}
          />

          <Button fullWidth onClick={handleRegisterYield} loading={loading}>
            Registrar Rendimento
          </Button>
        </Stack>
      </Modal>
    </div>
  );
}
