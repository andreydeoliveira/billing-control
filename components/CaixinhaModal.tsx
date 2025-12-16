import { Modal, Button, Group, Stack, NumberInput, Select } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState, useEffect } from 'react';
import { ContaBancaria, Caixinha } from '@prisma/client';
import { SearchableSelect } from './SearchableSelect';
import { getCaixinhasByContaBancaria } from '../app/transacoes/actions';
import { aportarCaixinha, resgatarCaixinha } from '../app/transacoes/actions';
import { useRouter } from 'next/navigation';

interface CaixinhaModalProps {
  opened: boolean;
  onClose: () => void;
  tipo: 'aporte' | 'resgate';
  contasBancarias: ContaBancaria[];
}

export function CaixinhaModal({ opened, onClose, tipo, contasBancarias }: CaixinhaModalProps) {
  const router = useRouter();
  const [caixinhas, setCaixinhas] = useState<Caixinha[]>([]);

  const form = useForm({
    initialValues: {
      contaBancariaId: '',
      caixinhaId: '',
      valor: 0,
    },
    validate: {
      contaBancariaId: (value) => (!value ? 'Selecione uma conta bancária' : null),
      caixinhaId: (value) => (!value ? 'Selecione uma caixinha' : null),
      valor: (value) => (value <= 0 ? 'Valor deve ser maior que zero' : null),
    },
  });

  useEffect(() => {
    if (opened) {
      form.reset();
      setCaixinhas([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened]);

  useEffect(() => {
    const carregarCaixinhas = async () => {
      if (form.values.contaBancariaId) {
        const caixinhasCarregadas = await getCaixinhasByContaBancaria(form.values.contaBancariaId);
        setCaixinhas(caixinhasCarregadas);
      } else {
        setCaixinhas([]);
        form.setFieldValue('caixinhaId', '');
      }
    };

    carregarCaixinhas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.values.contaBancariaId]);

  const handleSubmit = async (values: typeof form.values) => {
    if (tipo === 'aporte') {
      await aportarCaixinha(values.caixinhaId, values.valor);
    } else {
      await resgatarCaixinha(values.caixinhaId, values.valor);
    }

    form.reset();
    onClose();
    router.refresh();
  };

  const contaBancariaOptions = contasBancarias.map(cb => ({
    value: cb.id,
    label: `${cb.nomeConta} - ${cb.nomeBanco}`
  }));

  const caixinhaOptions = caixinhas.map(c => ({
    value: c.id,
    label: c.nome
  }));

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title={tipo === 'aporte' ? 'Aportar em Caixinha' : 'Resgatar de Caixinha'}
      size="md"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <SearchableSelect
            label="Conta Bancária"
            placeholder="Selecione ou pesquise uma conta bancária"
            data={contaBancariaOptions}
            required
            {...form.getInputProps('contaBancariaId')}
          />

          <Select
            label="Caixinha"
            placeholder={caixinhas.length === 0 ? 'Nenhuma caixinha disponível' : 'Selecione uma caixinha'}
            data={caixinhaOptions}
            required
            disabled={caixinhas.length === 0}
            {...form.getInputProps('caixinhaId')}
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
            {...form.getInputProps('valor')}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              {tipo === 'aporte' ? 'Aportar' : 'Resgatar'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
