'use client';

import { Modal, TextInput, Textarea, Switch, Button, Group, Stack, Radio } from '@mantine/core';
import { useForm } from '@mantine/form';
import { createConta, updateConta } from '../app/cadastros/actions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Conta, Categoria } from '@prisma/client';
import { SearchableSelect } from './SearchableSelect';

interface ContaFormProps {
  opened: boolean;
  onClose: () => void;
  conta?: Conta & { categoria: Categoria };
  categorias: Categoria[];
}

export function ContaForm({ opened, onClose, conta, categorias }: ContaFormProps) {
  const router = useRouter();
  const isEditing = !!conta;

  const form = useForm({
    initialValues: {
      nome: '',
      tipo: 'despesa',
      observacao: '',
      categoriaId: '',
      status: true,
    },
    validate: {
      nome: (value: string) => (!value ? 'Nome é obrigatório' : null),
      categoriaId: (value: string) => (!value ? 'Categoria é obrigatória' : null),
    },
  });

  useEffect(() => {
    if (conta) {
      form.setValues({
        nome: conta.nome,
        tipo: conta.tipo || 'despesa',
        observacao: conta.observacao || '',
        categoriaId: conta.categoriaId,
        status: conta.status === 'Ativo',
      });
    } else {
      form.reset();
    }
  }, [conta, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    const formData = new FormData();
    formData.append('nome', values.nome);
    formData.append('tipo', values.tipo);
    formData.append('observacao', values.observacao);
    formData.append('categoriaId', values.categoriaId);
    formData.append('status', values.status ? 'Ativo' : 'Inativo');

    if (isEditing) {
      await updateConta(conta.id, formData);
    } else {
      await createConta(formData);
    }

    form.reset();
    onClose();
    router.refresh();
  };

  const categoriaOptions = categorias.map(cat => ({
    value: cat.id,
    label: cat.nome
  }));

  return (
    <Modal opened={opened} onClose={onClose} title={isEditing ? 'Editar Conta' : 'Nova Conta'} size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Nome"
            placeholder="Digite o nome da conta"
            required
            {...form.getInputProps('nome')}
          />

          <Radio.Group
            label="Tipo"
            required
            {...form.getInputProps('tipo')}
          >
            <Group mt="xs">
              <Radio value="despesa" label="Despesa" />
              <Radio value="receita" label="Receita" />
            </Group>
          </Radio.Group>

          <Textarea
            label="Observação"
            placeholder="Observações sobre a conta"
            minRows={3}
            {...form.getInputProps('observacao')}
          />

          <SearchableSelect
            label="Categoria"
            placeholder="Selecione ou pesquise uma categoria"
            data={categoriaOptions}
            required
            {...form.getInputProps('categoriaId')}
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
