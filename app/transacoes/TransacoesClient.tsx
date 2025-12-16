'use client';

import { useState, useEffect } from 'react';
import { Container, Paper, Group, Text, Button, Select, TextInput, Table, Badge, Stack, Tabs, ActionIcon, Tooltip, NumberInput } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconChevronLeft, IconChevronRight, IconPlus, IconArrowsExchange, IconCreditCard, IconSearch, IconCalendarEvent, IconPigMoney, IconCash, IconCheck, IconX, IconTrash, IconRefresh, IconTrashX } from '@tabler/icons-react';
import { getTransacoesMes, getFaturasMes, confirmarTransacao, desconfirmarTransacao, deleteTransacao, getCaixinhasByContaBancaria } from './actions';
import { recalcularTodosSaldos, limparTransacoes } from '../extrato/actions';
import { TransacaoForm } from '@/components/TransacaoForm';
import { TransferenciaForm } from '@/components/TransferenciaForm';
import { FaturasModal } from '@/components/FaturasModal';
import { GerarTransacoesModal } from '@/components/GerarTransacoesModal';
import { CaixinhaModal } from '@/components/CaixinhaModal';
import { CartoesCreditoTab } from './CartoesCreditoTab';
import type { Transacao, FaturaCartao, Conta, Categoria, ContaBancaria, Cartao, Caixinha, GastoProvisionado } from '@prisma/client';

type TransacaoCompleta = Transacao & {
  conta?: (Conta & { categoria: Categoria }) | null;
  contaBancaria?: ContaBancaria | null;
  cartao?: Cartao | null;
  caixinha?: Caixinha | null;
  gastoProvisionado?: GastoProvisionado | null;
  faturaCartao?: FaturaCartao | null;
  contaBancariaOrigem?: ContaBancaria | null;
  contaBancariaDestino?: ContaBancaria | null;
};

type FaturaCompleta = FaturaCartao & {
  cartao: Cartao & { contaBancaria: ContaBancaria };
  transacoes: (Transacao & {
    conta?: (Conta & { categoria: Categoria }) | null;
  })[];
  contaBancariaPagto?: ContaBancaria | null;
};

interface TransacoesClientProps {
  transacoesIniciais: TransacaoCompleta[];
  faturasIniciais: FaturaCompleta[];
  contas: (Conta & { categoria: Categoria })[];
  contasBancarias: ContaBancaria[];
  cartoes: Cartao[];
  caixinhas: Caixinha[];
  gastosProvisionados: (GastoProvisionado & { 
    conta: Conta & { categoria: Categoria };
    mesesExcluidos: Array<{ mes: number; ano: number }>;
    cartao?: { contaBancariaId: string } | null;
  })[];
  mesInicial: number;
  anoInicial: number;
}

// Helper functions para gastos provisionados
function isMonthExcluded(gasto: GastoProvisionado & { mesesExcluidos: Array<{ mes: number; ano: number }> }, mes: number, ano: number) {
  return gasto.mesesExcluidos.some(me => me.mes === mes && me.ano === ano);
}

function shouldGenerateInMonth(gasto: GastoProvisionado & { mesesExcluidos: Array<{ mes: number; ano: number }> }, mes: number, ano: number) {
  const dataInicio = new Date(gasto.dataInicio);
  const mesInicio = dataInicio.getMonth() + 1;
  const anoInicio = dataInicio.getFullYear();

  if (ano < anoInicio || (ano === anoInicio && mes < mesInicio)) {
    return false;
  }

  if (gasto.dataFinal) {
    const dataFinal = new Date(gasto.dataFinal);
    const mesFinal = dataFinal.getMonth() + 1;
    const anoFinal = dataFinal.getFullYear();
    if (ano > anoFinal || (ano === anoFinal && mes > mesFinal)) {
      return false;
    }
  }

  if (isMonthExcluded(gasto, mes, ano)) {
    return false;
  }

  if (gasto.tipoRecorrencia === 'mensal') {
    return true;
  }

  if (gasto.tipoRecorrencia.endsWith('x')) {
    return mes === mesInicio && ano === anoInicio;
  }

  return false;
}

export function TransacoesClient({
  transacoesIniciais,
  faturasIniciais,
  contas,
  contasBancarias,
  cartoes,
  caixinhas,
  gastosProvisionados,
  mesInicial,
  anoInicial
}: TransacoesClientProps) {
  const [mes, setMes] = useState(mesInicial);
  const [ano, setAno] = useState(anoInicial);
  const [transacoes, setTransacoes] = useState<TransacaoCompleta[]>(transacoesIniciais);
  const [faturas, setFaturas] = useState<FaturaCompleta[]>(faturasIniciais);
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [filtroConta, setFiltroConta] = useState<string>('todas');
  const [busca, setBusca] = useState('');
  const [transacaoModalOpen, setTransacaoModalOpen] = useState(false);
  const [editingTransacao, setEditingTransacao] = useState<Transacao | undefined>(undefined);
  const [transferenciaModalOpen, setTransferenciaModalOpen] = useState(false);
  const [faturasModalOpen, setFaturasModalOpen] = useState(false);
  const [gerarTransacoesModalOpen, setGerarTransacoesModalOpen] = useState(false);
  const [caixinhaModalOpen, setCaixinhaModalOpen] = useState(false);
  const [caixinhaModalTipo, setCaixinhaModalTipo] = useState<'aporte' | 'resgate'>('aporte');
  const [abaAtiva, setAbaAtiva] = useState<string | null>('transacoes');

  const mesesNomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const carregarDados = async () => {
    const [novasTransacoes, novasFaturas] = await Promise.all([
      getTransacoesMes(mes, ano),
      getFaturasMes(mes, ano)
    ]);
    setTransacoes(novasTransacoes);
    setFaturas(novasFaturas);
  };

  useEffect(() => {
    carregarDados();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, ano]);

  const mesAnterior = () => {
    if (mes === 1) {
      setMes(12);
      setAno(ano - 1);
    } else {
      setMes(mes - 1);
    }
  };

  const mesSeguinte = () => {
    if (mes === 12) {
      setMes(1);
      setAno(ano + 1);
    } else {
      setMes(mes + 1);
    }
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

  const handleConfirmar = async (transacao: TransacaoCompleta) => {
    let valorRealState = transacao.valor;
    let caixinhaIdState: string | null = null;
    let formaPagamentoState = transacao.formaPagamento || 'transferencia_pix';
    let contaBancariaIdState = transacao.contaBancariaId || '';
    let cartaoIdState = transacao.cartaoId || '';
    let caixinhasDisponiveis: Caixinha[] = [];

    // Buscar caixinhas da conta inicial
    if (contaBancariaIdState) {
      caixinhasDisponiveis = await getCaixinhasByContaBancaria(contaBancariaIdState);
    }

    modals.open({
      title: 'Confirmar Transação',
      children: (
        <Stack gap="md">
          <Text size="sm">
            Transação: <strong>{transacao.descricao}</strong>
          </Text>
          {transacao.valorEsperado && transacao.valorEsperado !== transacao.valor && (
            <>
              <Text size="sm">
                Valor previsto: <strong>{formatCurrency(transacao.valorEsperado)}</strong>
              </Text>
              <Text size="sm">
                Valor atual: <strong>{formatCurrency(transacao.valor)}</strong>
              </Text>
            </>
          )}
          <NumberInput
            label="Valor Real"
            placeholder="0.00"
            decimalScale={2}
            fixedDecimalScale
            thousandSeparator="."
            decimalSeparator=","
            prefix="R$ "
            min={0}
            defaultValue={transacao.valor}
            onChange={(value) => valorRealState = typeof value === 'number' ? value : transacao.valor}
          />
          
          <Select
            label="Forma de Pagamento"
            defaultValue={formaPagamentoState}
            data={[
              { value: 'transferencia_pix', label: 'Transferência/PIX' },
              { value: 'cartao_credito', label: 'Cartão de Crédito' },
              { value: 'dinheiro', label: 'Dinheiro' }
            ]}
            onChange={async (value) => {
              formaPagamentoState = value || 'transferencia_pix';
              // Limpar caixinha ao trocar forma
              caixinhaIdState = null;
              // Se mudou para transferencia_pix e tem conta, buscar caixinhas
              if (value === 'transferencia_pix' && contaBancariaIdState) {
                caixinhasDisponiveis = await getCaixinhasByContaBancaria(contaBancariaIdState);
              } else {
                caixinhasDisponiveis = [];
              }
              // Forçar rerender do modal
              modals.closeAll();
              handleConfirmar(transacao);
            }}
          />

          {formaPagamentoState === 'transferencia_pix' && (
            <Select
              label="Conta Bancária"
              defaultValue={contaBancariaIdState}
              data={contasBancarias.map(cb => ({ 
                value: cb.id, 
                label: `${cb.nomeConta} - ${cb.nomeBanco}` 
              }))}
              onChange={async (value) => {
                contaBancariaIdState = value || '';
                caixinhaIdState = null; // Limpar caixinha ao trocar conta
                if (value) {
                  caixinhasDisponiveis = await getCaixinhasByContaBancaria(value);
                } else {
                  caixinhasDisponiveis = [];
                }
                // Forçar rerender do modal
                modals.closeAll();
                handleConfirmar(transacao);
              }}
            />
          )}

          {formaPagamentoState === 'cartao_credito' && (
            <Select
              label="Cartão de Crédito"
              defaultValue={cartaoIdState}
              data={cartoes.map(c => ({ value: c.id, label: c.nome }))}
              onChange={(value) => {
                cartaoIdState = value || '';
                caixinhaIdState = null; // Limpar caixinha se usar cartão
                caixinhasDisponiveis = [];
              }}
            />
          )}

          {formaPagamentoState === 'transferencia_pix' && caixinhasDisponiveis.length > 0 && (
            <Select
              label={transacao.tipo === 'receita' ? 'Aportar em Caixinha (opcional)' : 'Resgatar de Caixinha (opcional)'}
              placeholder="Nenhuma"
              data={caixinhasDisponiveis.map(c => ({ value: c.id, label: `${c.nome} - ${formatCurrency(c.saldo)}` }))}
              onChange={(value) => caixinhaIdState = value}
              clearable
            />
          )}
          
          <Group justify="flex-end" gap="xs">
            <Button variant="subtle" onClick={() => modals.closeAll()}>
              Cancelar
            </Button>
            <Button 
              color="green"
              onClick={async () => {
                await confirmarTransacao(
                  transacao.id, 
                  valorRealState, 
                  caixinhaIdState || undefined,
                  formaPagamentoState,
                  contaBancariaIdState || undefined,
                  cartaoIdState || undefined
                );
                modals.closeAll();
                carregarDados();
              }}
            >
              Confirmar
            </Button>
          </Group>
        </Stack>
      ),
    });
  };

  const handleExcluir = (transacao: TransacaoCompleta) => {
    modals.openConfirmModal({
      title: 'Excluir Transação',
      children: (
        <Text size="sm">
          Tem certeza que deseja excluir a transação <strong>{transacao.descricao}</strong> no valor de <strong>{formatCurrency(transacao.valor)}</strong>?
        </Text>
      ),
      labels: { confirm: 'Excluir', cancel: 'Cancelar' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        await deleteTransacao(transacao.id);
        carregarDados();
      },
    });
  };

  // Calcular resumo do mês
  const receitas = transacoes
    .filter(t => t.tipo === 'receita' && t.status === 'confirmado')
    .reduce((acc, t) => acc + t.valor, 0);
  
  const despesas = transacoes
    .filter(t => t.tipo === 'despesa' && t.status === 'confirmado')
    .reduce((acc, t) => acc + t.valor, 0);

  // Calcular previsto (pendentes + confirmados + gastos provisionados sem transação)
  const gastosProvisionadosComTransacao = new Set(
    transacoes.filter(t => t.gastoProvisionadoId).map(t => t.gastoProvisionadoId)
  );

  const gastosProvisionadosMes = gastosProvisionados.filter(gasto => 
    !gastosProvisionadosComTransacao.has(gasto.id) && 
    shouldGenerateInMonth(gasto, mes, ano)
  );

  const receitasPrevistas = transacoes
    .filter(t => t.tipo === 'receita')
    .reduce((acc, t) => acc + (t.valorEsperado || t.valor), 0) +
    gastosProvisionadosMes
      .filter(g => g.conta.tipo === 'receita')
      .reduce((acc, g) => acc + g.valorEsperado, 0);
  
  const despesasPrevistas = transacoes
    .filter(t => t.tipo === 'despesa')
    .reduce((acc, t) => acc + (t.valorEsperado || t.valor), 0) +
    gastosProvisionadosMes
      .filter(g => g.conta.tipo === 'despesa')
      .reduce((acc, g) => acc + g.valorEsperado, 0);

  // Saldo atual das contas bancárias (campo saldo do banco de dados)
  const saldoContasBancarias = contasBancarias.reduce((acc, cb) => acc + cb.saldo, 0);

  // Filtrar transações
  const transacoesFiltradas = transacoes.filter(t => {
    if (filtroTipo !== 'todos' && t.tipo !== filtroTipo) return false;
    if (filtroStatus !== 'todos' && t.status !== filtroStatus) return false;
    if (filtroConta !== 'todas' && t.contaId !== filtroConta) return false;
    if (busca && !t.descricao.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  return (
    <Container size="100%" px="md" py="md">
      {/* Header com mês */}
      <Group justify="space-between" align="center" mb="lg">
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
        
        <Group gap="xs">
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="light"
            color="blue"
            size="compact-sm"
            onClick={async () => {
              await recalcularTodosSaldos();
              carregarDados();
            }}
          >
            Recalcular Saldos
          </Button>
          <Button
            leftSection={<IconTrashX size={16} />}
            variant="light"
            color="red"
            size="compact-sm"
            onClick={() => {
              modals.openConfirmModal({
                title: 'Limpar Transações',
                children: (
                  <Text size="sm">
                    Tem certeza que deseja limpar TODAS as transações? Esta ação não pode ser desfeita!
                  </Text>
                ),
                labels: { confirm: 'Limpar', cancel: 'Cancelar' },
                confirmProps: { color: 'red' },
                onConfirm: async () => {
                  await limparTransacoes();
                  carregarDados();
                },
              });
            }}
          >
            Limpar Transações
          </Button>
        </Group>
      </Group>

      {/* Tabs: Transações e Cartões */}
      <Tabs value={abaAtiva} onChange={setAbaAtiva}>
        <Tabs.List>
          <Tabs.Tab value="transacoes">Transações</Tabs.Tab>
          <Tabs.Tab value="cartoes">Cartões de Crédito</Tabs.Tab>
        </Tabs.List>

        {/* ABA TRANSAÇÕES */}
        <Tabs.Panel value="transacoes" pt="md">
          <Stack gap="md">
            {/* Botões de Ação */}
            <Group gap="xs" wrap="wrap">
              <Button 
                leftSection={<IconPlus size={16} />}
                size="compact-sm"
                onClick={() => setTransacaoModalOpen(true)}
              >
                Nova
              </Button>
              <Button 
                leftSection={<IconArrowsExchange size={16} />}
                variant="light"
                size="compact-sm"
                onClick={() => setTransferenciaModalOpen(true)}
              >
                Transferência
              </Button>
              <Button 
                leftSection={<IconCalendarEvent size={16} />}
                variant="light"
                size="compact-sm"
                onClick={() => setGerarTransacoesModalOpen(true)}
              >
                Gerar Provisionadas
              </Button>
              <Button 
                leftSection={<IconPigMoney size={16} />}
                variant="light"
                size="compact-sm"
                onClick={() => {
                  setCaixinhaModalTipo('aporte');
                  setCaixinhaModalOpen(true);
                }}
              >
                Caixinha: Aportar
              </Button>
              <Button 
                leftSection={<IconCash size={16} />}
                variant="light"
                size="compact-sm"
                onClick={() => {
                  setCaixinhaModalTipo('resgate');
                  setCaixinhaModalOpen(true);
                }}
              >
                Caixinha: Resgatar
              </Button>
            </Group>

      {/* Resumo compacto */}
      <Group grow mb="lg">
        <Paper p="sm" withBorder>
          <Text size="xs" c="dimmed" mb={4}>Receitas (confirmadas)</Text>
          <Text size="lg" fw={600} c="green">+{formatCurrency(receitas)}</Text>
          <Text size="xs" c="dimmed" mt={4}>Previsto: +{formatCurrency(receitasPrevistas)}</Text>
        </Paper>
        <Paper p="sm" withBorder>
          <Text size="xs" c="dimmed" mb={4}>Despesas (confirmadas)</Text>
          <Text size="lg" fw={600} c="red">-{formatCurrency(despesas)}</Text>
          <Text size="xs" c="dimmed" mt={4}>Previsto: -{formatCurrency(despesasPrevistas)}</Text>
        </Paper>
        <Paper p="sm" withBorder>
          <Text size="xs" c="dimmed" mb={4}>Saldo em Contas</Text>
          <Text size="lg" fw={600} c={saldoContasBancarias >= 0 ? 'green' : 'red'}>
            {formatCurrency(saldoContasBancarias)}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>Previsto: {formatCurrency(saldoContasBancarias + (receitasPrevistas - receitas) - (despesasPrevistas - despesas))}</Text>
        </Paper>
      </Group>

      {/* Filtros compactos */}
      <Paper p="md" withBorder mb="md">
        <Stack gap="xs">
          <Group gap="xs" wrap="wrap">
            <Select
              placeholder="Tipo"
              size="sm"
              data={[
                { value: 'todos', label: 'Todos' },
                { value: 'receita', label: 'Receita' },
                { value: 'despesa', label: 'Despesa' },
                { value: 'transferencia', label: 'Transferência' }
              ]}
              value={filtroTipo}
              onChange={(value) => setFiltroTipo(value || 'todos')}
              clearable
              style={{ minWidth: 140, flex: 1 }}
            />
            <Select
              placeholder="Status"
              size="sm"
              data={[
                { value: 'todos', label: 'Todos' },
                { value: 'pendente', label: 'Pendente' },
                { value: 'confirmado', label: 'Confirmado' },
                { value: 'pago', label: 'Pago' }
              ]}
              value={filtroStatus}
              onChange={(value) => setFiltroStatus(value || 'todos')}
              clearable
              style={{ minWidth: 140, flex: 1 }}
            />
            <Select
              placeholder="Conta"
              size="sm"
              data={[
                { value: 'todas', label: 'Todas' },
                ...contas.map(c => ({ value: c.id, label: c.nome }))
              ]}
              value={filtroConta}
              onChange={(value) => setFiltroConta(value || 'todas')}
              clearable
              style={{ minWidth: 180, flex: 1 }}
            />
          </Group>
          <TextInput
            placeholder="Buscar..."
            size="sm"
            leftSection={<IconSearch size={16} />}
            value={busca}
            onChange={(e) => setBusca(e.currentTarget.value)}
          />
        </Stack>

        {/* Tabela de Transações */}
        <Paper p="md" withBorder mt="md">
        {transacoesFiltradas.length === 0 ? (
          <Text c="dimmed" ta="center" py="xl">
            Nenhuma transação encontrada
          </Text>
        ) : (
          <Table striped highlightOnHover style={{ minWidth: 800 }}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={100}>Data</Table.Th>
                <Table.Th>Descrição</Table.Th>
                <Table.Th w={180} visibleFrom="md">Categoria</Table.Th>
                <Table.Th w={110} ta="right">Previsto</Table.Th>
                <Table.Th w={110} ta="right">Real</Table.Th>
                <Table.Th w={120} visibleFrom="sm">Tipo</Table.Th>
                <Table.Th w={120} visibleFrom="sm">Status</Table.Th>
                <Table.Th w={140}>Ações</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {transacoesFiltradas.map((transacao) => (
                <Table.Tr key={transacao.id}>
                  <Table.Td>
                    <Text size="sm">{formatDate(transacao.data)}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>{transacao.descricao}</Text>
                    {transacao.observacao && (
                      <Text size="xs" c="dimmed">{transacao.observacao}</Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    {transacao.conta && (
                      <Text size="sm">{transacao.conta.categoria.nome}</Text>
                    )}
                  </Table.Td>
                  <Table.Td ta="right">
                    {transacao.valorEsperado && transacao.valorEsperado !== transacao.valor ? (
                      <Text size="sm" c="dimmed">
                        {formatCurrency(transacao.valorEsperado)}
                      </Text>
                    ) : (
                      <Text size="sm" c="dimmed">-</Text>
                    )}
                  </Table.Td>
                  <Table.Td ta="right">
                    <Text
                      size="sm"
                      fw={600}
                      c={transacao.tipo === 'receita' ? 'green' : transacao.tipo === 'despesa' ? 'red' : 'gray'}
                    >
                      {transacao.tipo === 'receita' ? '+' : transacao.tipo === 'despesa' ? '-' : ''}
                      {formatCurrency(transacao.valor)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" variant="light" color={
                      transacao.tipo === 'receita' ? 'green' :
                      transacao.tipo === 'despesa' ? 'red' : 'blue'
                    }>
                      {transacao.tipo === 'receita' ? 'Receita' :
                       transacao.tipo === 'despesa' ? 'Despesa' : 'Transfer.'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" color={
                      transacao.status === 'confirmado' ? 'green' :
                      transacao.status === 'pendente' ? 'yellow' : 'gray'
                    }>
                      {transacao.status === 'confirmado' ? 'Confirmado' :
                       transacao.status === 'pendente' ? 'Pendente' : 'Pago'}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={4} wrap="nowrap">
                      {transacao.status === 'pendente' ? (
                        <Tooltip label="Confirmar">
                          <ActionIcon
                            size="sm"
                            color="green"
                            variant="subtle"
                            onClick={() => handleConfirmar(transacao)}
                          >
                            <IconCheck size={16} />
                          </ActionIcon>
                        </Tooltip>
                      ) : (
                        <Tooltip label="Desconfirmar">
                          <ActionIcon
                            size="sm"
                            color="orange"
                            variant="subtle"
                            onClick={async () => {
                              await desconfirmarTransacao(transacao.id);
                              carregarDados();
                            }}
                          >
                            <IconX size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                      <Button 
                        size="compact-xs" 
                        variant="subtle"
                        onClick={() => {
                          // Se for pagamento de fatura, abrir aba de cartões
                          if (transacao.descricao.includes('Pagamento Fatura')) {
                            setAbaAtiva('cartoes');
                          } else {
                            setEditingTransacao(transacao);
                            setTransacaoModalOpen(true);
                          }
                        }}
                      >
                        Editar
                      </Button>
                      <Tooltip label="Excluir">
                        <ActionIcon
                          size="sm"
                          color="red"
                          variant="subtle"
                          onClick={() => handleExcluir(transacao)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
        </Paper>
      </Paper>
          </Stack>
        </Tabs.Panel>

        {/* ABA CARTÕES DE CRÉDITO */}
        <Tabs.Panel value="cartoes" pt="md">
          <CartoesCreditoTab
            faturas={faturas}
            cartoes={cartoes}
            contas={contas}
            contasBancarias={contasBancarias}
            mes={mes}
            ano={ano}
            onRecarregar={carregarDados}
          />
        </Tabs.Panel>
      </Tabs>

      <TransacaoForm
        opened={transacaoModalOpen}
        onClose={() => {
          setTransacaoModalOpen(false);
          setEditingTransacao(undefined);
        }}
        transacao={editingTransacao}
        contas={contas}
        contasBancarias={contasBancarias}
        cartoes={cartoes}
        caixinhas={caixinhas}
        mesAtual={mes}
        anoAtual={ano}
      />

      <TransferenciaForm
        opened={transferenciaModalOpen}
        onClose={() => setTransferenciaModalOpen(false)}
        contasBancarias={contasBancarias}
        mesAtual={mes}
        anoAtual={ano}
      />

      <FaturasModal
        opened={faturasModalOpen}
        onClose={() => setFaturasModalOpen(false)}
        faturas={faturas}
        contasBancarias={contasBancarias}
      />

      <GerarTransacoesModal
        opened={gerarTransacoesModalOpen}
        onClose={() => {
          setGerarTransacoesModalOpen(false);
          carregarDados();
        }}
      />

      <CaixinhaModal
        opened={caixinhaModalOpen}
        onClose={() => {
          setCaixinhaModalOpen(false);
          carregarDados();
        }}
        tipo={caixinhaModalTipo}
        contasBancarias={contasBancarias}
      />
    </Container>
  );
}
