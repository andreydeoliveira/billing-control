'use client';

import { Modal, TextInput, NumberInput, Switch, Button, Group, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { createCaixinha, updateCaixinha } from '../app/cadastros/actions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Caixinha, ContaBancaria } from '@prisma/client';
import { SearchableSelect } from './SearchableSelect';

interface CaixinhaFormProps {
  opened: boolean;
  onClose: () => void;
  caixinha?: Caixinha & { contaBancaria: ContaBancaria };
  contasBancarias: ContaBancaria[];
  preSelectedContaBancariaId?: string;
}

export function CaixinhaForm({ opened, onClose, caixinha, contasBancarias, preSelectedContaBancariaId }: CaixinhaFormProps) {
  const router = useRouter();
  const isEditing = !!caixinha;

  const form = useForm({
    initialValues: {
      nome: '',
      valorInicial: 0,
      contaBancariaId: '',
      status: true,
    },
    validate: {
      nome: (value: string) => (!value ? 'Nome é obrigatório' : null),
      contaBancariaId: (value: string) => (!value ? 'Conta bancária é obrigatória' : null),
    },
  });

  useEffect(() => {
    if (opened) {
      if (caixinha) {
        form.setValues({
          nome: caixinha.nome,
          valorInicial: caixinha.valorInicial || 0,
          contaBancariaId: caixinha.contaBancariaId,
          status: caixinha.status === 'Ativo',
        });
      } else {
        form.reset();
        if (preSelectedContaBancariaId) {
          form.setFieldValue('contaBancariaId', preSelectedContaBancariaId);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caixinha, opened, preSelectedContaBancariaId]);

  const handleSubmit = async (values: typeof form.values) => {
    const formData = new FormData();
    formData.append('nome', values.nome);
    formData.append('valorInicial', values.valorInicial.toString());
    formData.append('contaBancariaId', values.contaBancariaId);
    formData.append('status', values.status ? 'Ativo' : 'Inativo');

    if (isEditing) {
      await updateCaixinha(caixinha.id, formData);
    } else {
      await createCaixinha(formData);
    }

    form.reset();
    onClose();
    router.refresh();
  };

  const contaBancariaOptions = contasBancarias.map(conta => ({
    value: conta.id,
    label: `${conta.nomeConta} - ${conta.nomeBanco}`
  }));

  const selectedContaBancaria = preSelectedContaBancariaId 
    ? contasBancarias.find(cb => cb.id === preSelectedContaBancariaId)
    : null;

  const modalTitle = isEditing 
    ? 'Editar Caixinha' 
    : selectedContaBancaria 
      ? `Nova Caixinha - ${selectedContaBancaria.nomeConta}` 
      : 'Nova Caixinha';

  return (
    <Modal opened={opened} onClose={onClose} title={modalTitle} size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Nome"
            placeholder="Digite o nome da caixinha"
            required
            {...form.getInputProps('nome')}
          />

          {!preSelectedContaBancariaId && (
            <SearchableSelect
              label="Conta Bancária"
              placeholder="Selecione ou pesquise uma conta"
              data={contaBancariaOptions}
              required
              {...form.getInputProps('contaBancariaId')}
            />
          )}

          <NumberInput
            label="Valor Inicial"
            placeholder="0.00"
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator="."
            decimalSeparator=","
            prefix="R$ "
            {...form.getInputProps('valorInicial')}
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
