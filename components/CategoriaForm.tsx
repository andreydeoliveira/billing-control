'use client';

import { Modal, TextInput, Textarea, Switch, Button, Group, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { createCategoria, updateCategoria } from '../app/cadastros/actions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Categoria } from '@prisma/client';

interface CategoriaFormProps {
  opened: boolean;
  onClose: () => void;
  categoria?: Categoria;
}

export function CategoriaForm({ opened, onClose, categoria }: CategoriaFormProps) {
  const router = useRouter();
  const isEditing = !!categoria;

  const form = useForm({
    initialValues: {
      nome: '',
      observacao: '',
      status: true,
    },
    validate: {
      nome: (value: string) => (!value ? 'Nome é obrigatório' : null),
    },
  });

  useEffect(() => {
    if (categoria) {
      form.setValues({
        nome: categoria.nome,
        observacao: categoria.observacao || '',
        status: categoria.status === 'Ativo',
      });
    } else {
      form.reset();
    }
  }, [categoria, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    const formData = new FormData();
    formData.append('nome', values.nome);
    formData.append('observacao', values.observacao);
    formData.append('status', values.status ? 'Ativo' : 'Inativo');

    if (isEditing) {
      await updateCategoria(categoria.id, formData);
    } else {
      await createCategoria(formData);
    }

    form.reset();
    onClose();
    router.refresh();
  };

  return (
    <Modal opened={opened} onClose={onClose} title={isEditing ? 'Editar Categoria' : 'Nova Categoria'}>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Nome da Categoria"
            placeholder="Digite o nome"
            required
            {...form.getInputProps('nome')}
          />

          <Textarea
            label="Observação"
            placeholder="Observações sobre a categoria"
            minRows={3}
            {...form.getInputProps('observacao')}
          />

          <Switch
            label="Ativo"
            {...form.getInputProps('status', { type: 'checkbox' })}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {isEditing ? 'Salvar' : 'Criar'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
