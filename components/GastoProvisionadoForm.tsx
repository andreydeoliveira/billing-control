'use client';

import { Modal, Textarea, NumberInput, Switch, Button, Group, Stack, Select } from '@mantine/core';
import { useForm } from '@mantine/form';
import { DateInput } from '@mantine/dates';
import { createGastoProvisionado, updateGastoProvisionado, verificarTransacoesGastoProvisionado } from '../app/cadastros/actions';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { GastoProvisionado, Conta, Categoria, ContaBancaria, Cartao } from '@prisma/client';
import { SearchableSelect } from './SearchableSelect';
import { ConfirmarAtualizacaoModal } from './ConfirmarAtualizacaoModal';

interface GastoProvisionadoFormProps {
  opened: boolean;
  onClose: () => void;
  gastoProvisionado?: GastoProvisionado & { 
    conta: Conta & { categoria: Categoria };
    contaBancaria?: ContaBancaria | null;
    cartao?: (Cartao & { contaBancaria: ContaBancaria }) | null;
  };
  contas: (Conta & { categoria: Categoria })[];
  contasBancarias: ContaBancaria[];
  cartoes: (Cartao & { contaBancaria: ContaBancaria })[];
}

export function GastoProvisionadoForm({ 
  opened, 
  onClose, 
  gastoProvisionado, 
  contas,
  contasBancarias,
  cartoes
}: GastoProvisionadoFormProps) {
  const router = useRouter();
  const isEditing = !!gastoProvisionado;
  const [confirmarModalOpen, setConfirmarModalOpen] = useState(false);
  const [transacoesExistentes, setTransacoesExistentes] = useState(0);
  const [formDataPendente, setFormDataPendente] = useState<FormData | null>(null);

  const form = useForm({
    initialValues: {
      contaId: '',
      observacao: '',
      valorEsperado: 0,
      formaPagamento: 'transferencia_pix',
      contaBancariaId: '',
      cartaoId: '',
      tipoRecorrencia: 'unico',
      numeroParcelas: 1,
      dataInicio: new Date(),
      dataFinal: null as Date | null,
      status: true,
    },
    validate: {
      contaId: (value: string) => (!value ? 'Conta é obrigatória' : null),
      valorEsperado: (value: number) => (value <= 0 ? 'Valor deve ser maior que zero' : null),
      contaBancariaId: (value: string, values) => 
        values.formaPagamento === 'transferencia_pix' && !value ? 'Conta bancária é obrigatória' : null,
      cartaoId: (value: string, values) => 
        values.formaPagamento === 'cartao_credito' && !value ? 'Cartão é obrigatório' : null,
      numeroParcelas: (value: number, values) => 
        values.tipoRecorrencia === 'parcelado' && value < 2 ? 'Número de parcelas deve ser maior que 1' : null,
    },
  });

  useEffect(() => {
    if (opened) {
      if (gastoProvisionado) {
        // Converter formato antigo (1x, 2x, etc) para novo formato (unico, parcelado)
        let tipoRecorrencia = gastoProvisionado.tipoRecorrencia;
        let numeroParcelas = 1;
        
        if (tipoRecorrencia.endsWith('x')) {
          const parcelas = parseInt(tipoRecorrencia.replace('x', ''));
          tipoRecorrencia = parcelas === 1 ? 'unico' : 'parcelado';
          numeroParcelas = parcelas;
        }

        form.setValues({
          contaId: gastoProvisionado.contaId,
          observacao: gastoProvisionado.observacao || '',
          valorEsperado: gastoProvisionado.valorEsperado,
          formaPagamento: gastoProvisionado.formaPagamento,
          contaBancariaId: gastoProvisionado.contaBancariaId || '',
          cartaoId: gastoProvisionado.cartaoId || '',
          tipoRecorrencia: tipoRecorrencia,
          numeroParcelas: numeroParcelas,
          dataInicio: new Date(gastoProvisionado.dataInicio),
          dataFinal: gastoProvisionado.dataFinal ? new Date(gastoProvisionado.dataFinal) : null,
          status: gastoProvisionado.status === 'Ativo',
        });
      } else {
        form.reset();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastoProvisionado, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    const formData = new FormData();
    formData.append('contaId', values.contaId);
    formData.append('observacao', values.observacao);
    formData.append('valorEsperado', values.valorEsperado.toString());
    formData.append('formaPagamento', values.formaPagamento);
    formData.append('contaBancariaId', values.contaBancariaId);
    formData.append('cartaoId', values.cartaoId);
    
    // Converter novo formato para formato do banco
    let tipoRecorrenciaDB = values.tipoRecorrencia;
    if (values.tipoRecorrencia === 'parcelado') {
      tipoRecorrenciaDB = `${values.numeroParcelas}x`;
    } else if (values.tipoRecorrencia === 'unico') {
      tipoRecorrenciaDB = '1x';
    }
    
    formData.append('tipoRecorrencia', tipoRecorrenciaDB);
    formData.append('dataInicio', values.dataInicio.toISOString());
    formData.append('dataFinal', values.dataFinal ? values.dataFinal.toISOString() : '');
    formData.append('status', values.status ? 'Ativo' : 'Inativo');

    if (isEditing) {
      // Verificar se existem transações
      const count = await verificarTransacoesGastoProvisionado(gastoProvisionado.id);
      
      if (count > 0) {
        // Tem transações - mostrar modal de confirmação
        setTransacoesExistentes(count);
        setFormDataPendente(formData);
        setConfirmarModalOpen(true);
      } else {
        // Não tem transações - atualizar direto
        await updateGastoProvisionado(gastoProvisionado.id, formData);
        form.reset();
        onClose();
        router.refresh();
      }
    } else {
      await createGastoProvisionado(formData);
      form.reset();
      onClose();
      router.refresh();
    }
  };

  const handleConfirmarAtualizacao = async (atualizarTodos: boolean) => {
    if (formDataPendente && gastoProvisionado) {
      await updateGastoProvisionado(gastoProvisionado.id, formDataPendente, atualizarTodos);
      form.reset();
      setFormDataPendente(null);
      onClose();
      router.refresh();
    }
  };

  const contaOptions = contas.map(conta => ({
    value: conta.id,
    label: `${conta.nome} - ${conta.tipo === 'receita' ? 'Receita' : 'Despesa'}`
  }));

  const contaBancariaOptions = contasBancarias.map(cb => ({
    value: cb.id,
    label: `${cb.nomeConta} - ${cb.nomeBanco}`
  }));

  const cartaoOptions = cartoes.map(cartao => ({
    value: cartao.id,
    label: `${cartao.contaBancaria.nomeConta} (${cartao.contaBancaria.nomeBanco}) - ${cartao.nome}`
  }));

  const recorrenciaOptions = [
    { value: 'unico', label: 'Único' },
    { value: 'parcelado', label: 'Parcelado' },
    { value: 'mensal', label: 'Mensal' },
    { value: 'anual', label: 'Anual' },
  ];

  return (
    <Modal 
      opened={opened} 
      onClose={onClose} 
      title={isEditing ? 'Editar Gasto Provisionado' : 'Novo Gasto Provisionado'} 
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <SearchableSelect
            label="Conta"
            placeholder="Selecione ou pesquise uma conta"
            data={contaOptions}
            required
            {...form.getInputProps('contaId')}
          />

          <Textarea
            label="Observação"
            placeholder="Observações sobre o gasto"
            minRows={2}
            {...form.getInputProps('observacao')}
          />

          <NumberInput
            label="Valor Esperado"
            placeholder="0.00"
            required
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator="."
            decimalSeparator=","
            prefix="R$ "
            min={0}
            {...form.getInputProps('valorEsperado')}
          />

          <Select
            label="Forma de Pagamento"
            placeholder="Selecione a forma de pagamento"
            required
            data={[
              { value: 'transferencia_pix', label: 'Transferência/PIX' },
              { value: 'cartao_credito', label: 'Cartão de Crédito' }
            ]}
            {...form.getInputProps('formaPagamento')}
          />

          {form.values.formaPagamento === 'transferencia_pix' && (
            <SearchableSelect
              label="Conta Bancária"
              placeholder="Selecione ou pesquise uma conta bancária"
              data={contaBancariaOptions}
              required
              {...form.getInputProps('contaBancariaId')}
            />
          )}

          {form.values.formaPagamento === 'cartao_credito' && (
            <SearchableSelect
              label="Cartão de Crédito"
              placeholder="Selecione ou pesquise um cartão"
              data={cartaoOptions}
              required
              {...form.getInputProps('cartaoId')}
            />
          )}

          <Select
            label="Tipo de Recorrência"
            placeholder="Selecione o tipo de recorrência"
            required
            data={recorrenciaOptions}
            {...form.getInputProps('tipoRecorrencia')}
          />

          {form.values.tipoRecorrencia === 'parcelado' && (
            <NumberInput
              label="Número de Parcelas"
              placeholder="Digite o número de parcelas"
              required
              min={2}
              max={100}
              {...form.getInputProps('numeroParcelas')}
            />
          )}

          <DateInput
            label="Data de Início"
            placeholder="Selecione a data"
            required
            valueFormat="DD/MM/YYYY"
            {...form.getInputProps('dataInicio')}
          />

          <DateInput
            label="Data Final"
            placeholder="Selecione a data (opcional)"
            valueFormat="DD/MM/YYYY"
            clearable
            {...form.getInputProps('dataFinal')}
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

      <ConfirmarAtualizacaoModal
        opened={confirmarModalOpen}
        onClose={() => {
          setConfirmarModalOpen(false);
          setFormDataPendente(null);
        }}
        onConfirm={handleConfirmarAtualizacao}
        transacoesExistentes={transacoesExistentes}
      />
    </Modal>
  );
}
