'use client';

import { Table, Badge, Button, Group, Text, Stack } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { ActionMenu } from '@/components/ActionMenu';
import { useState } from 'react';
import { CaixinhaForm } from '@/components/CaixinhaForm';
import { deleteCaixinha, recalcularSaldoCaixinha } from '../app/cadastros/actions';
import { useRouter } from 'next/navigation';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { Caixinha, ContaBancaria } from '@prisma/client';

interface CaixinhaGridProps {
  caixinhas: (Caixinha & { contaBancaria: ContaBancaria })[];
  contasBancarias: ContaBancaria[];
  preSelectedContaBancariaId?: string;
}

export function CaixinhaGrid({ caixinhas, contasBancarias, preSelectedContaBancariaId }: CaixinhaGridProps) {
  const router = useRouter();
  const [formOpened, setFormOpened] = useState(false);
  const [editingCaixinha, setEditingCaixinha] = useState<(Caixinha & { contaBancaria: ContaBancaria }) | undefined>();

  const handleEdit = (caixinha: Caixinha & { contaBancaria: ContaBancaria }) => {
    setEditingCaixinha(caixinha);
    setFormOpened(true);
  };

  const handleNew = () => {
    setEditingCaixinha(undefined);
    setFormOpened(true);
  };

  const handleDelete = (id: string, nome: string) => {
    modals.openConfirmModal({
      title: 'Confirmar exclusão',
      children: (
        <Text size="sm">
          Tem certeza que deseja excluir a caixinha <strong>{nome}</strong>?
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await deleteCaixinha(id);
        router.refresh();
      },
    });
  };

  const handleRecalcular = async (id: string, nome: string) => {
    modals.openConfirmModal({
      title: 'Recalcular saldo',
      children: (
        <Stack gap="sm">
          <Text size="sm">
            Deseja recalcular o saldo da caixinha <strong>{nome}</strong> baseado no histórico de transações?
          </Text>
          <Text size="sm" c="dimmed">
            O saldo será recalculado a partir do valor inicial mais todas as transações confirmadas/pagas.
          </Text>
        </Stack>
      ),
      labels: { confirm: 'Recalcular', cancel: 'Cancelar' },
      confirmProps: { color: 'blue' },
      onConfirm: async () => {
        try {
          const resultado = await recalcularSaldoCaixinha(id);
          notifications.show({
            title: 'Saldo recalculado!',
            message: `Saldo anterior: ${formatCurrency(resultado.saldoAnterior)} → Novo saldo: ${formatCurrency(resultado.saldoNovo)} (${resultado.transacoesProcessadas} transações processadas)`,
            color: 'green',
          });
          router.refresh();
        } catch (error) {
          notifications.show({
            title: 'Erro ao recalcular',
            message: (error as Error).message,
            color: 'red',
          });
        }
      },
    });
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <>
      <Group justify="space-between" mb="md">
        <Text size="lg" fw={500}>Caixinhas</Text>
        <Button leftSection={<IconPlus size={18} />} onClick={handleNew}>
          Nova Caixinha
        </Button>
      </Group>

      {caixinhas.length === 0 ? (
        <Text c="dimmed">Nenhuma caixinha cadastrada</Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Conta Bancária</Table.Th>
              <Table.Th>Valor Inicial</Table.Th>
              <Table.Th>Saldo Atual</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th style={{ width: '80px' }}>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {caixinhas.map((caixinha) => (
              <Table.Tr key={caixinha.id}>
                <Table.Td>{caixinha.nome}</Table.Td>
                <Table.Td>
                  <Badge variant="light">{caixinha.contaBancaria.nomeConta}</Badge>
                </Table.Td>
                <Table.Td>{formatCurrency(caixinha.valorInicial)}</Table.Td>
                <Table.Td>
                  <Text fw={600} c={caixinha.saldo >= 0 ? 'green' : 'red'}>
                    {formatCurrency(caixinha.saldo)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge color={caixinha.status === 'Ativo' ? 'green' : 'gray'}>
                    {caixinha.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <ActionMenu
                    onEdit={() => handleEdit(caixinha)}
                    onDelete={() => handleDelete(caixinha.id, caixinha.nome)}
                    onRecalcular={() => handleRecalcular(caixinha.id, caixinha.nome)}
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <CaixinhaForm
        opened={formOpened}
        onClose={() => setFormOpened(false)}
        caixinha={editingCaixinha}
        contasBancarias={contasBancarias}
        preSelectedContaBancariaId={preSelectedContaBancariaId}
      />
    </>
  );
}
