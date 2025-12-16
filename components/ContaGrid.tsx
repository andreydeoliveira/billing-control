'use client';

import { Table, Badge, Button, Group, Text, Tabs } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { ActionMenu } from '@/components/ActionMenu';
import { useState } from 'react';
import { ContaForm } from '@/components/ContaForm';
import { deleteConta } from '../app/cadastros/actions';
import { useRouter } from 'next/navigation';
import { modals } from '@mantine/modals';
import { Conta, Categoria } from '@prisma/client';
import { CategoriaGrid } from './CategoriaGrid';

interface ContaGridProps {
  contas: (Conta & { categoria: Categoria })[];
  categorias: Categoria[];
  categoriasAtivas: Categoria[];
}

export function ContaGrid({ contas, categorias, categoriasAtivas }: ContaGridProps) {
  const router = useRouter();
  const [formOpened, setFormOpened] = useState(false);
  const [editingConta, setEditingConta] = useState<(Conta & { categoria: Categoria }) | undefined>();

  const handleEdit = (conta: Conta & { categoria: Categoria }) => {
    setEditingConta(conta);
    setFormOpened(true);
  };

  const handleNew = () => {
    setEditingConta(undefined);
    setFormOpened(true);
  };

  const handleDelete = (id: string, nome: string) => {
    modals.openConfirmModal({
      title: 'Confirmar exclusão',
      children: (
        <Text size="sm">
          Tem certeza que deseja excluir a conta <strong>{nome}</strong>?
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await deleteConta(id);
        router.refresh();
      },
    });
  };

  return (
    <Tabs defaultValue="contas">
      <Tabs.List>
        <Tabs.Tab value="contas">Contas</Tabs.Tab>
        <Tabs.Tab value="categorias">Categorias</Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="contas" pt="md">
        <Group justify="space-between" mb="md">
          <Text size="lg" fw={500}>Contas</Text>
          <Button leftSection={<IconPlus size={18} />} onClick={handleNew}>
            Nova Conta
          </Button>
        </Group>

        {contas.length === 0 ? (
          <Text c="dimmed">Nenhuma conta cadastrada</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nome</Table.Th>
                <Table.Th>Categoria</Table.Th>
                <Table.Th>Observação</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th style={{ width: '100px' }}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {contas.map((conta) => (
                <Table.Tr key={conta.id}>
                  <Table.Td>{conta.nome}</Table.Td>
                  <Table.Td>
                    <Badge variant="light">{conta.categoria.nome}</Badge>
                  </Table.Td>
                  <Table.Td>{conta.observacao || '-'}</Table.Td>
                  <Table.Td>
                    <Badge color={conta.status === 'Ativo' ? 'green' : 'gray'}>
                      {conta.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <ActionMenu
                      onEdit={() => handleEdit(conta)}
                      onDelete={() => handleDelete(conta.id, conta.nome)}
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}

        <ContaForm
          opened={formOpened}
          onClose={() => setFormOpened(false)}
          conta={editingConta}
          categorias={categoriasAtivas}
        />
      </Tabs.Panel>

      <Tabs.Panel value="categorias" pt="md">
        <CategoriaGrid categorias={categorias} />
      </Tabs.Panel>
    </Tabs>
  );
}
