'use client';

import { Modal, TextInput, NumberInput, Switch, Button, Group, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { createCartao, updateCartao } from '../app/cadastros/actions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Cartao, ContaBancaria } from '@prisma/client';
import { SearchableSelect } from './SearchableSelect';

interface CartaoFormProps {
  opened: boolean;
  onClose: () => void;
  cartao?: Cartao & { contaBancaria: ContaBancaria };
  contasBancarias: ContaBancaria[];
  preSelectedContaBancariaId?: string;
}

export function CartaoForm({ opened, onClose, cartao, contasBancarias, preSelectedContaBancariaId }: CartaoFormProps) {
  const router = useRouter();
  const isEditing = !!cartao;

  const form = useForm({
    initialValues: {
      nome: '',
      diaFechamento: '',
      diaVencimento: '',
      contaBancariaId: '',
      status: true,
    },
    validate: {
      nome: (value: string) => (!value ? 'Nome é obrigatório' : null),
      contaBancariaId: (value: string) => (!value ? 'Conta bancária é obrigatória' : null),
      diaFechamento: (value: string) => {
        if (value && (parseInt(value) < 1 || parseInt(value) > 31)) {
          return 'Dia deve estar entre 1 e 31';
        }
        return null;
      },
      diaVencimento: (value: string) => {
        if (value && (parseInt(value) < 1 || parseInt(value) > 31)) {
          return 'Dia deve estar entre 1 e 31';
        }
        return null;
      },
    },
  });

  useEffect(() => {
    if (opened) {
      if (cartao) {
        form.setValues({
          nome: cartao.nome,
          diaFechamento: cartao.diaFechamento?.toString() || '',
          diaVencimento: cartao.diaVencimento?.toString() || '',
          contaBancariaId: cartao.contaBancariaId,
          status: cartao.status === 'Ativo',
        });
      } else {
        form.reset();
        if (preSelectedContaBancariaId) {
          form.setFieldValue('contaBancariaId', preSelectedContaBancariaId);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartao, opened, preSelectedContaBancariaId]);

  const handleSubmit = async (values: typeof form.values) => {
    const formData = new FormData();
    formData.append('nome', values.nome);
    formData.append('diaFechamento', values.diaFechamento);
    formData.append('diaVencimento', values.diaVencimento);
    formData.append('contaBancariaId', values.contaBancariaId);
    formData.append('status', values.status ? 'Ativo' : 'Inativo');

    if (isEditing) {
      await updateCartao(cartao.id, formData);
    } else {
      await createCartao(formData);
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
    ? 'Editar Cartão' 
    : selectedContaBancaria 
      ? `Novo Cartão - ${selectedContaBancaria.nomeConta}` 
      : 'Novo Cartão';

  return (
    <Modal opened={opened} onClose={onClose} title={modalTitle} size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Nome"
            placeholder="Digite o nome do cartão"
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
            label="Dia de Fechamento"
            placeholder="1-31"
            min={1}
            max={31}
            {...form.getInputProps('diaFechamento')}
          />

          <NumberInput
            label="Dia de Vencimento"
            placeholder="1-31"
            min={1}
            max={31}
            {...form.getInputProps('diaVencimento')}
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
