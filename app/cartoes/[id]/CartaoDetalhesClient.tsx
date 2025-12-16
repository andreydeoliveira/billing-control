'use client';

import { useState } from 'react';
import { Container, Paper, Title, Group, Text, Button, Stack, Table, Badge, NumberInput } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconPlus, IconCheck, IconCash } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import type { Cartao, ContaBancaria, FaturaCartao, Transacao, Conta, Categoria, Caixinha } from '@prisma/client';
import { TransacaoCartaoForm } from '@/components/TransacaoCartaoForm';
import { confirmarTransacaoCartao, pagarFatura } from '@/app/cartoes/actions';
import { DateInput } from '@mantine/dates';
import { SearchableSelect } from '@/components/SearchableSelect';

type CartaoCompleto = Cartao & {
  contaBancaria: ContaBancaria;
};

type FaturaCompleta = FaturaCartao & {
  transacoes: (Transacao & {
    conta?: (Conta & { categoria: Categoria }) | null;
    caixinha?: Caixinha | null;
  })[];
  contaBancariaPagto?: ContaBancaria | null;
};

interface CartaoDetalhesClientProps {
  cartao: CartaoCompleto;
  fatura: FaturaCompleta | null;
  contas: (Conta & { categoria: Categoria })[];
  contasBancarias: ContaBancaria[];
  mes: number;
  ano: number;
}

export function CartaoDetalhesClient({
  cartao,
  fatura: faturaInicial,
  contas,
  contasBancarias,
  mes: mesInicial,
  ano: anoInicial
}: CartaoDetalhesClientProps) {
  const router = useRouter();
  const [mes, setMes] = useState(mesInicial);
  const [ano, setAno] = useState(anoInicial);
  const [transacaoModalOpen, setTransacaoModalOpen] = useState(false);
  const [pagamentoAberto, setPagamentoAberto] = useState(false);
  const [contaBancariaPagto, setContaBancariaPagto] = useState('');
  const [dataPagamento, setDataPagamento] = useState<Date | null>(new Date());
  const [valorPago, setValorPago] = useState(0);

  const mesesNomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const mesAnterior = () => {
    const novoMes = mes === 1 ? 12 : mes - 1;
    const novoAno = mes === 1 ? ano - 1 : ano;
    setMes(novoMes);
    setAno(novoAno);
    router.push(`/cartoes/${cartao.id}?mes=${novoMes}&ano=${novoAno}`);
  };

  const mesSeguinte = () => {
    const novoMes = mes === 12 ? 1 : mes + 1;
    const novoAno = mes === 12 ? ano + 1 : ano;
    setMes(novoMes);
    setAno(novoAno);
    router.push(`/cartoes/${cartao.id}?mes=${novoMes}&ano=${novoAno}`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
  };

  const handleConfirmarTransacao = async (transacaoId: string, valorReal: number) => {
    await confirmarTransacaoCartao(transacaoId, valorReal);
    router.refresh();
  };

  const handlePagarFatura = async () => {
    if (!faturaInicial || !contaBancariaPagto || !dataPagamento) return;
    
    await pagarFatura(faturaInicial.id, contaBancariaPagto, dataPagamento, valorPago || faturaInicial.valorTotal);
    setPagamentoAberto(false);
    router.refresh();
  };

  const totalPendente = faturaInicial?.transacoes
    .filter(t => t.status === 'pendente')
    .reduce((acc, t) => acc + t.valorEsperado!, 0) || 0;

  const totalConfirmado = faturaInicial?.transacoes
    .filter(t => t.status === 'confirmado')
    .reduce((acc, t) => acc + t.valor, 0) || 0;

  const contaBancariaOptions = contasBancarias.map(cb => ({
    value: cb.id,
    label: `${cb.nomeConta} - ${cb.nomeBanco}`
  }));

  return (
    <Container size="100%" px="md" py="md">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <Button 
              variant="subtle" 
              onClick={() => router.push('/cartoes')}
            >
              ← Voltar
            </Button>
            <div>
              <Title order={2}>{cartao.nome}</Title>
              <Text size="sm" c="dimmed">{cartao.contaBancaria.nomeConta}</Text>
            </div>
          </Group>

          <Group gap="xs">
            <Button 
              variant="subtle" 
              size="compact-sm"
              onClick={mesAnterior}
              px="xs"
            >
              <IconChevronLeft size={16} />
            </Button>
            <Text size="lg" fw={600}>
              {mesesNomes[mes - 1]} {ano}
            </Text>
            <Button 
              variant="subtle" 
              size="compact-sm"
              onClick={mesSeguinte}
              px="xs"
            >
              <IconChevronRight size={16} />
            </Button>
          </Group>
        </Group>

        {/* Resumo da Fatura */}
        <Group grow>
          <Paper p="md" withBorder>
            <Text size="xs" c="dimmed" mb={4}>Previsto (Pendente)</Text>
            <Text size="xl" fw={600} c="orange">{formatCurrency(totalPendente)}</Text>
          </Paper>
          <Paper p="md" withBorder>
            <Text size="xs" c="dimmed" mb={4}>Confirmado</Text>
            <Text size="xl" fw={600} c="blue">{formatCurrency(totalConfirmado)}</Text>
          </Paper>
          <Paper p="md" withBorder>
            <Text size="xs" c="dimmed" mb={4}>Total da Fatura</Text>
            <Text size="xl" fw={600} c={faturaInicial?.status === 'pago' ? 'green' : 'red'}>
              {formatCurrency(faturaInicial?.valorTotal || 0)}
            </Text>
          </Paper>
          <Paper p="md" withBorder>
            <Text size="xs" c="dimmed" mb={4}>Status</Text>
            <Badge size="lg" color={faturaInicial?.status === 'pago' ? 'green' : 'yellow'}>
              {faturaInicial?.status === 'pago' ? 'Paga' : 'Aberta'}
            </Badge>
          </Paper>
        </Group>

        {/* Ações */}
        <Group>
          <Button 
            leftSection={<IconPlus size={16} />}
            onClick={() => setTransacaoModalOpen(true)}
          >
            Nova Transação
          </Button>
          
          {faturaInicial && faturaInicial.status !== 'pago' && (
            <Button 
              leftSection={<IconCash size={16} />}
              variant="filled"
              color="green"
              onClick={() => {
                setPagamentoAberto(!pagamentoAberto);
                setValorPago(faturaInicial.valorTotal);
              }}
            >
              Pagar Fatura
            </Button>
          )}
        </Group>

        {/* Formulário de Pagamento */}
        {pagamentoAberto && faturaInicial && (
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Title order={4}>Pagar Fatura</Title>
              <Group grow align="flex-start">
                <SearchableSelect
                  label="Conta Bancária"
                  placeholder="Selecione a conta para pagamento"
                  data={contaBancariaOptions}
                  value={contaBancariaPagto}
                  onChange={(value) => setContaBancariaPagto(value || '')}
                />
                <DateInput
                  label="Data do Pagamento"
                  value={dataPagamento}
                  onChange={(value) => setDataPagamento(value)}
                  valueFormat="DD/MM/YYYY"
                />
                <NumberInput
                  label="Valor Pago"
                  value={valorPago}
                  onChange={(value) => setValorPago(Number(value))}
                  decimalScale={2}
                  fixedDecimalScale
                  decimalSeparator=","
                  thousandSeparator="."
                  prefix="R$ "
                />
              </Group>
              <Group>
                <Button onClick={handlePagarFatura} disabled={!contaBancariaPagto}>
                  Confirmar Pagamento
                </Button>
                <Button variant="subtle" onClick={() => setPagamentoAberto(false)}>
                  Cancelar
                </Button>
              </Group>
            </Stack>
          </Paper>
        )}

        {/* Tabela de Transações */}
        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Data</Table.Th>
                <Table.Th>Descrição</Table.Th>
                <Table.Th>Categoria</Table.Th>
                <Table.Th>Valor Previsto</Table.Th>
                <Table.Th>Valor Real</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {faturaInicial?.transacoes.map((transacao) => (
                <Table.Tr key={transacao.id}>
                  <Table.Td>{formatDate(transacao.data)}</Table.Td>
                  <Table.Td>
                    <Text fw={500}>{transacao.descricao}</Text>
                    {transacao.observacao && (
                      <Text size="xs" c="dimmed">{transacao.observacao}</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {transacao.conta?.categoria.nome}
                  </Table.Td>
                  <Table.Td>
                    <Text c="dimmed">
                      {transacao.valorEsperado ? formatCurrency(transacao.valorEsperado) : '-'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500}>
                      {formatCurrency(transacao.valor)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge 
                      color={transacao.status === 'confirmado' ? 'green' : 'yellow'}
                      variant="light"
                    >
                      {transacao.status === 'confirmado' ? 'Confirmado' : 'Pendente'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {transacao.status === 'pendente' && (
                      <ConfirmarTransacaoInline
                        transacaoId={transacao.id}
                        valorEsperado={transacao.valorEsperado || 0}
                        onConfirmar={handleConfirmarTransacao}
                      />
                    )}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>

          {(!faturaInicial || faturaInicial.transacoes.length === 0) && (
            <Text ta="center" p="xl" c="dimmed">
              Nenhuma transação nesta fatura
            </Text>
          )}
        </Paper>
      </Stack>

      <TransacaoCartaoForm
        opened={transacaoModalOpen}
        onClose={() => {
          setTransacaoModalOpen(false);
          router.refresh();
        }}
        cartaoId={cartao.id}
        contas={contas}
        contasBancarias={contasBancarias}
        mes={mes}
        ano={ano}
      />
    </Container>
  );
}

// Componente inline para confirmar transação
function ConfirmarTransacaoInline({
  transacaoId,
  valorEsperado,
  onConfirmar
}: {
  transacaoId: string;
  valorEsperado: number;
  onConfirmar: (id: string, valor: number) => void;
}) {
  const [valor, setValor] = useState(valorEsperado);
  const [editando, setEditando] = useState(false);

  if (!editando) {
    return (
      <Button 
        size="compact-xs" 
        leftSection={<IconCheck size={14} />}
        onClick={() => setEditando(true)}
      >
        Confirmar
      </Button>
    );
  }

  return (
    <Group gap="xs">
      <NumberInput
        size="xs"
        value={valor}
        onChange={(v) => setValor(Number(v))}
        decimalScale={2}
        fixedDecimalScale
        decimalSeparator=","
        thousandSeparator="."
        prefix="R$ "
        style={{ width: 120 }}
      />
      <Button 
        size="compact-xs" 
        onClick={() => {
          onConfirmar(transacaoId, valor);
          setEditando(false);
        }}
      >
        OK
      </Button>
      <Button 
        size="compact-xs" 
        variant="subtle"
        onClick={() => setEditando(false)}
      >
        X
      </Button>
    </Group>
  );
}
