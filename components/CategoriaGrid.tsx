'use client';

import { Table, Badge, Button, Group, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { ActionMenu } from '@/components/ActionMenu';
import { useState } from 'react';
import { CategoriaForm } from '@/components/CategoriaForm';
import { deleteCategoria } from '../app/cadastros/actions';
import { useRouter } from 'next/navigation';
import { modals } from '@mantine/modals';
import { Categoria } from '@prisma/client';

interface CategoriaGridProps {
  categorias: Categoria[];
}

export function CategoriaGrid({ categorias }: CategoriaGridProps) {
  const router = useRouter();
  const [formOpened, setFormOpened] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | undefined>();

  const handleEdit = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    setFormOpened(true);
  };

  const handleNew = () => {
    setEditingCategoria(undefined);
    setFormOpened(true);
  };

  const handleDelete = (id: string, nome: string) => {
    modals.openConfirmModal({
      title: 'Confirmar exclusão',
      children: (
        <Text size="sm">
          Tem certeza que deseja excluir a categoria <strong>{nome}</strong>?
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await deleteCategoria(id);
        router.refresh();
      },
    });
  };

  return (
    <div>
      <Group justify="space-between" mb="md">
        <Text size="lg" fw={500}>Categorias</Text>
        <Button leftSection={<IconPlus size={18} />} onClick={handleNew}>
          Nova Categoria
        </Button>
      </Group>

      {categorias.length === 0 ? (
        <Text c="dimmed">Nenhuma categoria cadastrada</Text>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Observação</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th style={{ width: '100px' }}>Ações</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {categorias.map((cat) => (
              <Table.Tr key={cat.id}>
                <Table.Td>{cat.nome}</Table.Td>
                <Table.Td>{cat.observacao || '-'}</Table.Td>
                <Table.Td>
                  <Badge color={cat.status === 'Ativo' ? 'green' : 'gray'}>
                    {cat.status}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <ActionMenu
                    onEdit={() => handleEdit(cat)}
                    onDelete={() => handleDelete(cat.id, cat.nome)}
                  />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      <CategoriaForm
        opened={formOpened}
        onClose={() => setFormOpened(false)}
        categoria={editingCategoria}
      />
    </div>
  );
}
