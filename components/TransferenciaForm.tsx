'use client';

import { Modal, Textarea, NumberInput, Button, Group, Stack } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { createTransferencia } from '../app/transacoes/actions';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ContaBancaria } from '@prisma/client';
import { SearchableSelect } from './SearchableSelect';

interface TransferenciaFormProps {
  opened: boolean;
  onClose: () => void;
  contasBancarias: ContaBancaria[];
  mesAtual: number;
  anoAtual: number;
}

export function TransferenciaForm({ 
  opened, 
  onClose, 
  contasBancarias,
  mesAtual,
  anoAtual
}: TransferenciaFormProps) {
  const router = useRouter();

  const form = useForm({
    initialValues: {
      data: new Date(anoAtual, mesAtual - 1, new Date().getDate()),
      valor: 0,
      contaBancariaOrigemId: '',
      contaBancariaDestinoId: '',
      observacao: '',
    },
    validate: {
      valor: (value: number) => (value <= 0 ? 'Valor deve ser maior que zero' : null),
      contaBancariaOrigemId: (value: string) => (!value ? 'Conta de origem é obrigatória' : null),
      contaBancariaDestinoId: (value: string, values) => {
        if (!value) return 'Conta de destino é obrigatória';
        if (value === values.contaBancariaOrigemId) return 'Contas de origem e destino devem ser diferentes';
        return null;
      },
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  const handleSubmit = async (values: typeof form.values) => {
    const formData = new FormData();
    formData.append('data', values.data.toISOString());
    formData.append('valor', values.valor.toString());
    formData.append('contaBancariaOrigemId', values.contaBancariaOrigemId);
    formData.append('contaBancariaDestinoId', values.contaBancariaDestinoId);
    formData.append('observacao', values.observacao);

    await createTransferencia(formData);

    form.reset();
    onClose();
    router.refresh();
  };

  const contaBancariaOptions = contasBancarias.map(cb => ({
    value: cb.id,
    label: `${cb.nomeConta} - ${cb.nomeBanco}`
  }));

  return (
    <Modal opened={opened} onClose={onClose} title="Nova Transferência" size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <SearchableSelect
            label="Conta de Origem"
            placeholder="Selecione a conta de origem"
            data={contaBancariaOptions}
            required
            {...form.getInputProps('contaBancariaOrigemId')}
          />

          <SearchableSelect
            label="Conta de Destino"
            placeholder="Selecione a conta de destino"
            data={contaBancariaOptions}
            required
            {...form.getInputProps('contaBancariaDestinoId')}
          />

          <NumberInput
            label="Valor"
            placeholder="0.00"
            required
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator="."
            decimalSeparator=","
            prefix="R$ "
            min={0}
            {...form.getInputProps('valor')}
          />

          <DateInput
            label="Data"
            placeholder="Selecione a data"
            required
            valueFormat="DD/MM/YYYY"
            {...form.getInputProps('data')}
          />

          <Textarea
            label="Observação"
            placeholder="Observações sobre a transferência"
            minRows={2}
            {...form.getInputProps('observacao')}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              Confirmar Transferência
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
