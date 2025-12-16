'use client';

import { Table, Badge, Button, Group, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { ActionMenu } from '@/components/ActionMenu';
import { useState } from 'react';
import { CartaoForm } from '@/components/CartaoForm';
import { deleteCartao } from '../app/cadastros/actions';
import { useRouter } from 'next/navigation';
import { modals } from '@mantine/modals';
import { Cartao, ContaBancaria } from '@prisma/client';

interface CartaoGridProps {
  cartoes: (Cartao & { contaBancaria: ContaBancaria })[];
  contasBancarias: ContaBancaria[];
  preSelectedContaBancariaId?: string;
}

export function CartaoGrid({ cartoes, contasBancarias, preSelectedContaBancariaId }: CartaoGridProps) {
  const router = useRouter();
  const [formOpened, setFormOpened] = useState(false);
  const [editingCartao, setEditingCartao] = useState<(Cartao & { contaBancaria: ContaBancaria }) | undefined>();

  const handleEdit = (cartao: Cartao & { contaBancaria: ContaBancaria }) => {
    setEditingCartao(cartao);
    setFormOpened(true);
  };

  const handleNew = () => {
    setEditingCartao(undefined);
    setFormOpened(true);
  };

  const handleDelete = (id: string, nome: string) => {
    modals.openConfirmModal({
      title: 'Confirmar exclusão',
      children: (
        <Text size="sm">
          Tem certeza que deseja excluir o cartão <strong>{nome}</strong>?
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await deleteCartao(id);
        router.refresh();
      },
    });
  };

  return (
    <>
      <Group justify="space-between" mb="md">
        <Text size="lg" fw={500}>Cartões</Text>
        <Button leftSection={<IconPlus size={18} />} onClick={handleNew}>
          Novo Cartão
        </Button>
      </Group>

      {cartoes.length === 0 ? (
        <Text c="dimmed">Nenhum cartão cadastrado</Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Conta Bancária</Table.Th>
              <Table.Th>Dia Fechamento</Table.Th>
              <Table.Th>Dia Vencimento</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th style={{ width: '80px' }}>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {cartoes.map((cartao) => (
              <Table.Tr key={cartao.id}>
                <Table.Td>{cartao.nome}</Table.Td>
                <Table.Td>
                  <Badge variant="light">{cartao.contaBancaria.nomeConta}</Badge>
                </Table.Td>
                <Table.Td>{cartao.diaFechamento || '-'}</Table.Td>
                <Table.Td>{cartao.diaVencimento || '-'}</Table.Td>
                <Table.Td>
                  <Badge color={cartao.status === 'Ativo' ? 'green' : 'gray'}>
                    {cartao.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <ActionMenu
                    onEdit={() => handleEdit(cartao)}
                    onDelete={() => handleDelete(cartao.id, cartao.nome)}
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <CartaoForm
        opened={formOpened}
        onClose={() => setFormOpened(false)}
        cartao={editingCartao}
        contasBancarias={contasBancarias}
        preSelectedContaBancariaId={preSelectedContaBancariaId}
      />
    </>
  );
}
