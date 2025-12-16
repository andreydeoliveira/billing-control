'use client';

import { Table, Badge, Button, Group, Text } from '@mantine/core';
import { IconPlus, IconArrowLeft } from '@tabler/icons-react';
import { ActionMenu } from '@/components/ActionMenu';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ContaBancariaForm } from '@/components/ContaBancariaForm';
import { CartaoGrid } from '@/components/CartaoGrid';
import { CaixinhaGrid } from '@/components/CaixinhaGrid';
import { deleteContaBancaria } from '../app/cadastros/actions';
import { modals } from '@mantine/modals';
import { ContaBancaria, Cartao, Caixinha } from '@prisma/client';

type View = 'contas' | 'cartoes' | 'caixinhas';

interface ContaBancariaGridProps {
  contasBancarias: ContaBancaria[];
  contasBancariasAtivas: ContaBancaria[];
  cartoes: (Cartao & { contaBancaria: ContaBancaria })[];
  caixinhas: (Caixinha & { contaBancaria: ContaBancaria })[];
}

export function ContaBancariaGrid({ contasBancarias, contasBancariasAtivas, cartoes, caixinhas }: ContaBancariaGridProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formOpened, setFormOpened] = useState(false);
  const [editingContaBancaria, setEditingContaBancaria] = useState<ContaBancaria | undefined>();
  const [selectedContaBancariaId, setSelectedContaBancariaId] = useState<string | undefined>();

  const currentView = ((searchParams.get('view') as View) || 'contas');

  const handleViewChange = (view: View) => {
    const currentTab = searchParams.get('tab') || 'contas-bancarias';
    router.push(`/cadastros?tab=${currentTab}&view=${view}`);
  };

  const handleEdit = (contaBancaria: ContaBancaria) => {
    setEditingContaBancaria(contaBancaria);
    setFormOpened(true);
  };

  const handleNew = () => {
    setEditingContaBancaria(undefined);
    setFormOpened(true);
  };

  const handleDelete = (id: string, nomeConta: string) => {
    modals.openConfirmModal({
      title: 'Confirmar exclusão',
      children: (
        <Text size="sm">
          Tem certeza que deseja excluir a conta bancária <strong>{nomeConta}</strong>?
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await deleteContaBancaria(id);
        router.refresh();
      },
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (currentView === 'cartoes') {
    const selectedConta = selectedContaBancariaId 
      ? contasBancarias.find(cb => cb.id === selectedContaBancariaId)
      : null;

    // Filtrar apenas cartões da conta selecionada
    const cartoesFiltrados = selectedContaBancariaId
      ? cartoes.filter(c => c.contaBancariaId === selectedContaBancariaId)
      : cartoes;

    return (
      <>
        <Group justify="space-between" mb="md">
          <Group>
            <Button 
              leftSection={<IconArrowLeft size={18} />} 
              onClick={() => handleViewChange('contas')}
              variant="subtle"
            >
              Voltar
            </Button>
            <Text size="lg" fw={500}>
              Cartões{selectedConta && ` - ${selectedConta.nomeConta}`}
            </Text>
          </Group>
        </Group>
        <CartaoGrid cartoes={cartoesFiltrados} contasBancarias={contasBancariasAtivas} preSelectedContaBancariaId={selectedContaBancariaId} />
      </>
    );
  }

  if (currentView === 'caixinhas') {
    const selectedConta = selectedContaBancariaId 
      ? contasBancarias.find(cb => cb.id === selectedContaBancariaId)
      : null;

    // Filtrar apenas caixinhas da conta selecionada
    const caixinhasFiltradas = selectedContaBancariaId
      ? caixinhas.filter(c => c.contaBancariaId === selectedContaBancariaId)
      : caixinhas;

    return (
      <>
        <Group justify="space-between" mb="md">
          <Group>
            <Button 
              leftSection={<IconArrowLeft size={18} />} 
              onClick={() => handleViewChange('contas')}
              variant="subtle"
            >
              Voltar
            </Button>
            <Text size="lg" fw={500}>
              Caixinhas{selectedConta && ` - ${selectedConta.nomeConta}`}
            </Text>
          </Group>
        </Group>
        <CaixinhaGrid caixinhas={caixinhasFiltradas} contasBancarias={contasBancariasAtivas} preSelectedContaBancariaId={selectedContaBancariaId} />
      </>
    );
  }

  return (
    <>
      <Group justify="space-between" mb="md">
        <Text size="lg" fw={500}>Contas Bancárias</Text>
        <Button leftSection={<IconPlus size={18} />} onClick={handleNew}>
          Nova Conta Bancária
        </Button>
      </Group>

      {contasBancarias.length === 0 ? (
        <Text c="dimmed">Nenhuma conta bancária cadastrada</Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome da Conta</Table.Th>
              <Table.Th>Banco</Table.Th>
              <Table.Th>Saldo Inicial</Table.Th>
              <Table.Th>Saldo Atual</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th style={{ width: '100px' }}>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {contasBancarias.map((conta) => (
              <Table.Tr key={conta.id}>
                <Table.Td>{conta.nomeConta}</Table.Td>
                <Table.Td>{conta.nomeBanco}</Table.Td>
                <Table.Td>{formatCurrency(conta.saldoInicial)}</Table.Td>
                <Table.Td>
                  <Text fw={600} c={conta.saldo >= 0 ? 'green' : 'red'}>
                    {formatCurrency(conta.saldo)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={conta.status === 'Ativo' ? 'green' : 'gray'}>
                    {conta.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <ActionMenu
                    onEdit={() => handleEdit(conta)}
                    onDelete={() => handleDelete(conta.id, conta.nomeConta)}
                    onCartoes={() => {
                      setSelectedContaBancariaId(conta.id);
                      handleViewChange('cartoes');
                    }}
                    onCaixinhas={() => {
                      setSelectedContaBancariaId(conta.id);
                      handleViewChange('caixinhas');
                    }}
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <ContaBancariaForm
        opened={formOpened}
        onClose={() => setFormOpened(false)}
        contaBancaria={editingContaBancaria}
      />
    </>
  );
}
