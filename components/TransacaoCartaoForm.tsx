import { Modal, Select, Textarea, NumberInput, Button, Group, Stack } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { createTransacaoCartao } from '../app/cartoes/actions';
import { useState, useEffect } from 'react';
import { Conta, Categoria, ContaBancaria } from '@prisma/client';
import { SearchableSelect } from './SearchableSelect';

interface TransacaoCartaoFormProps {
  opened: boolean;
  onClose: () => void;
  cartaoId: string;
  contas: (Conta & { categoria: Categoria })[];
  contasBancarias: ContaBancaria[];
  mes: number;
  ano: number;
}

export function TransacaoCartaoForm({ 
  opened, 
  onClose,
  cartaoId,
  contas,
  mes,
  ano
}: TransacaoCartaoFormProps) {
  const form = useForm({
    initialValues: {
      data: new Date(ano, mes - 1, 1),
      contaId: '',
      descricao: '',
      valorEsperado: 0,
      observacao: '',
    },
    validate: {
      contaId: (value) => (!value ? 'Selecione uma conta' : null),
      descricao: (value) => (!value ? 'Digite uma descrição' : null),
      valorEsperado: (value) => (value <= 0 ? 'Valor deve ser maior que zero' : null),
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset();
      form.setFieldValue('data', new Date(ano, mes - 1, 1));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const handleSubmit = async (values: typeof form.values) => {
    const formData = new FormData();
    formData.append('cartaoId', cartaoId);
    formData.append('data', values.data.toISOString());
    formData.append('contaId', values.contaId);
    formData.append('descricao', values.descricao);
    formData.append('valorEsperado', values.valorEsperado.toString());
    formData.append('observacao', values.observacao);

    await createTransacaoCartao(formData);

    form.reset();
    onClose();
  };

  const contaOptions = contas.map(conta => ({
    value: conta.id,
    label: `${conta.nome} - ${conta.categoria.nome}`
  }));

  return (
    <Modal opened={opened} onClose={onClose} title="Nova Transação no Cartão" size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <DateInput
            label="Data"
            placeholder="Selecione a data"
            required
            valueFormat="DD/MM/YYYY"
            {...form.getInputProps('data')}
          />

          <SearchableSelect
            label="Conta (Categoria de Despesa)"
            placeholder="Selecione ou pesquise uma conta"
            data={contaOptions}
            required
            {...form.getInputProps('contaId')}
          />

          <Textarea
            label="Descrição"
            placeholder="Ex: Compra no supermercado"
            required
            {...form.getInputProps('descricao')}
          />

          <NumberInput
            label="Valor"
            placeholder="Digite o valor"
            required
            decimalScale={2}
            fixedDecimalScale
            decimalSeparator=","
            thousandSeparator="."
            prefix="R$ "
            min={0}
            {...form.getInputProps('valorEsperado')}
          />

          <Textarea
            label="Observação (Opcional)"
            placeholder="Informações adicionais"
            {...form.getInputProps('observacao')}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              Adicionar
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
