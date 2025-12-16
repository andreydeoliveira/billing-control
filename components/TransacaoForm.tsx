'use client';

import { Modal, Select, Textarea, NumberInput, Button, Group, Stack, Radio } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { createTransacao, updateTransacao } from '../app/transacoes/actions';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Conta, Categoria, ContaBancaria, Cartao, Transacao, Caixinha } from '@prisma/client';
import { SearchableSelect } from './SearchableSelect';

interface TransacaoFormProps {
  opened: boolean;
  onClose: () => void;
  transacao?: Transacao;
  contas: (Conta & { categoria: Categoria })[];
  contasBancarias: ContaBancaria[];
  cartoes: Cartao[];
  caixinhas: Caixinha[];
  mesAtual: number;
  anoAtual: number;
}

export function TransacaoForm({ 
  opened, 
  onClose,
  transacao,
  contas,
  contasBancarias,
  cartoes,
  caixinhas,
  mesAtual,
  anoAtual
}: TransacaoFormProps) {
  const router = useRouter();
  const isEditing = !!transacao;
  const [filtroTipo, setFiltroTipo] = useState<'despesa' | 'receita'>('despesa');

  const form = useForm({
    initialValues: {
      data: new Date(anoAtual, mesAtual - 1, new Date().getDate()),
      contaId: '',
      descricao: '',
      valor: 0,
      formaPagamento: 'transferencia_pix',
      contaBancariaId: '',
      cartaoId: '',
      caixinhaId: '',
      observacao: '',
      status: 'confirmado',
    },
    validate: {
      contaId: (value: string) => (!value ? 'Conta é obrigatória' : null),
      descricao: (value: string) => (!value ? 'Descrição é obrigatória' : null),
      valor: (value: number) => (value <= 0 ? 'Valor deve ser maior que zero' : null),
      contaBancariaId: (value: string, values) => 
        values.formaPagamento === 'transferencia_pix' && !value ? 'Conta bancária é obrigatória' : null,
      cartaoId: (value: string, values) => 
        values.formaPagamento === 'cartao_credito' && !value ? 'Cartão é obrigatório' : null,
    },
  });

  useEffect(() => {
    if (opened) {
      if (transacao) {
        // Carregar dados da transação
        const conta = contas.find(c => c.id === transacao.contaId);
        setFiltroTipo(conta?.tipo as 'despesa' | 'receita' || 'despesa');
        
        form.setValues({
          data: new Date(transacao.data),
          contaId: transacao.contaId || '',
          descricao: transacao.descricao,
          valor: transacao.valor,
          formaPagamento: transacao.formaPagamento || 'transferencia_pix',
          contaBancariaId: transacao.contaBancariaId || '',
          cartaoId: transacao.cartaoId || '',
          caixinhaId: transacao.caixinhaId || '',
          observacao: transacao.observacao || '',
          status: transacao.status,
        });
      } else {
        form.reset();
        setFiltroTipo('despesa');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, transacao]);

  const handleSubmit = async (values: typeof form.values) => {
    // Pegar o tipo da conta selecionada
    const contaSelecionada = contas.find(c => c.id === values.contaId);
    if (!contaSelecionada) return;

    const formData = new FormData();
    formData.append('data', values.data.toISOString());
    formData.append('tipo', contaSelecionada.tipo); // Tipo vem da conta
    formData.append('contaId', values.contaId);
    formData.append('descricao', values.descricao);
    formData.append('valor', values.valor.toString());
    formData.append('formaPagamento', values.formaPagamento);
    formData.append('contaBancariaId', values.contaBancariaId);
    formData.append('cartaoId', values.cartaoId);
    formData.append('caixinhaId', values.caixinhaId);
    formData.append('observacao', values.observacao);
    
    // Se está editando e o valor mudou, colocar como pendente
    // Senão, manter status original (se editando) ou usar o selecionado (se novo)
    if (isEditing && transacao && values.valor !== transacao.valor) {
      formData.append('status', 'pendente');
    } else {
      formData.append('status', isEditing ? (transacao?.status || 'pendente') : values.status);
    }

    if (isEditing) {
      await updateTransacao(transacao.id, formData);
    } else {
      await createTransacao(formData);
    }

    form.reset();
    onClose();
    router.refresh();
  };

  // Filtrar contas pelo tipo selecionado
  const contasFiltradas = contas.filter(c => c.tipo === filtroTipo);
  
  const contaOptions = contasFiltradas.map(conta => ({
    value: conta.id,
    label: `${conta.nome} (${conta.tipo === 'receita' ? 'Receita' : 'Despesa'})`
  }));

  const contaBancariaOptions = contasBancarias.map(cb => ({
    value: cb.id,
    label: `${cb.nomeConta} - ${cb.nomeBanco}`
  }));

  const cartaoOptions = cartoes.map(cartao => ({
    value: cartao.id,
    label: cartao.nome
  }));

  // Filtrar caixinhas pela conta bancária selecionada
  const caixinhasFiltradas = form.values.contaBancariaId
    ? caixinhas.filter(c => c.contaBancariaId === form.values.contaBancariaId)
    : [];

  const caixinhaOptions = caixinhasFiltradas.map(caixinha => ({
    value: caixinha.id,
    label: `${caixinha.nome} (Saldo: R$ ${caixinha.saldo.toFixed(2)})`
  }));

  return (
    <Modal opened={opened} onClose={onClose} title={isEditing ? "Editar Transação" : "Nova Transação"} size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <Radio.Group
            label="Filtrar por tipo"
            value={filtroTipo}
            onChange={(value) => {
              setFiltroTipo(value as 'despesa' | 'receita');
              form.setFieldValue('contaId', ''); // Limpa conta ao mudar tipo
            }}
          >
            <Group mt="xs">
              <Radio value="despesa" label="Despesa" />
              <Radio value="receita" label="Receita" />
            </Group>
          </Radio.Group>

          <SearchableSelect
            label="Conta"
            placeholder="Selecione ou pesquise uma conta"
            data={contaOptions}
            required
            {...form.getInputProps('contaId')}
          />

          <Textarea
            label="Descrição"
            placeholder="Digite a descrição"
            required
            minRows={2}
            {...form.getInputProps('descricao')}
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

          <Select
            label="Forma de Pagamento"
            placeholder="Selecione a forma de pagamento"
            required
            data={[
              { value: 'transferencia_pix', label: 'Transferência/PIX' },
              { value: 'cartao_credito', label: 'Cartão de Crédito' },
              { value: 'dinheiro', label: 'Dinheiro' }
            ]}
            {...form.getInputProps('formaPagamento')}
          />

          {form.values.formaPagamento === 'transferencia_pix' && (
            <>
              <SearchableSelect
                label="Conta Bancária"
                placeholder="Selecione ou pesquise uma conta bancária"
                data={contaBancariaOptions}
                required
                {...form.getInputProps('contaBancariaId')}
                onChange={(value) => {
                  form.setFieldValue('contaBancariaId', value);
                  form.setFieldValue('caixinhaId', ''); // Limpar caixinha ao mudar conta
                }}
              />

              {form.values.contaBancariaId && caixinhasFiltradas.length > 0 && (
                <SearchableSelect
                  label={filtroTipo === 'receita' ? 'Fazer aporte em caixinha (opcional)' : 'Sacar de caixinha (opcional)'}
                  placeholder="Selecione uma caixinha"
                  data={caixinhaOptions}
                  clearable
                  {...form.getInputProps('caixinhaId')}
                />
              )}
            </>
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

          <Textarea
            label="Observação"
            placeholder="Observações sobre a transação"
            minRows={2}
            {...form.getInputProps('observacao')}
          />

          {!isEditing && (
            <Select
              label="Status"
              placeholder="Selecione o status"
              required
              data={[
                { value: 'pendente', label: 'Pendente' },
                { value: 'confirmado', label: 'Confirmado' }
              ]}
              {...form.getInputProps('status')}
            />
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">
              Salvar Transação
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
