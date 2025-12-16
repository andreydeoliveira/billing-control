'use client';

import { Modal, TextInput, NumberInput, Switch, Button, Group, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { createContaBancaria, updateContaBancaria } from '../app/cadastros/actions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ContaBancaria } from '@prisma/client';

interface ContaBancariaFormProps {
  opened: boolean;
  onClose: () => void;
  contaBancaria?: ContaBancaria;
}

export function ContaBancariaForm({ opened, onClose, contaBancaria }: ContaBancariaFormProps) {
  const router = useRouter();
  const isEditing = !!contaBancaria;

  const form = useForm({
    initialValues: {
      nomeConta: '',
      nomeBanco: '',
      saldoInicial: 0,
      status: true,
    },
    validate: {
      nomeConta: (value: string) => (!value ? 'Nome da conta é obrigatório' : null),
      nomeBanco: (value: string) => (!value ? 'Nome do banco é obrigatório' : null),
    },
  });

  useEffect(() => {
    if (contaBancaria) {
      form.setValues({
        nomeConta: contaBancaria.nomeConta,
        nomeBanco: contaBancaria.nomeBanco,
        saldoInicial: contaBancaria.saldoInicial,
        status: contaBancaria.status === 'Ativo',
      });
    } else {
      form.reset();
    }
  }, [contaBancaria, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    const formData = new FormData();
    formData.append('nomeConta', values.nomeConta);
    formData.append('nomeBanco', values.nomeBanco);
    formData.append('saldoInicial', values.saldoInicial.toString());
    formData.append('status', values.status ? 'Ativo' : 'Inativo');

    if (isEditing) {
      await updateContaBancaria(contaBancaria.id, formData);
    } else {
      await createContaBancaria(formData);
    }

    form.reset();
    onClose();
    router.refresh();
  };

  return (
    <Modal opened={opened} onClose={onClose} title={isEditing ? 'Editar Conta Bancária' : 'Nova Conta Bancária'} size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Nome da Conta"
            placeholder="Digite o nome da conta"
            required
            {...form.getInputProps('nomeConta')}
          />

          <TextInput
            label="Nome do Banco"
            placeholder="Digite o nome do banco"
            required
            {...form.getInputProps('nomeBanco')}
          />

          <NumberInput
            label="Saldo Inicial"
            placeholder="0.00"
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator="."
            decimalSeparator=","
            prefix="R$ "
            {...form.getInputProps('saldoInicial')}
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
