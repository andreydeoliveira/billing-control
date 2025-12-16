'use client';

import { useState } from 'react';
import { Stack, Group, Paper, Text, Badge, Button, Table, NumberInput, Grid, Card, ActionIcon, Tooltip } from '@mantine/core';
import { IconPlus, IconCheck, IconCash, IconCreditCard, IconTrash, IconX } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { useRouter } from 'next/navigation';
import type { FaturaCartao, Cartao, Transacao, Conta, Categoria, ContaBancaria, Caixinha } from '@prisma/client';
import { TransacaoCartaoForm } from '@/components/TransacaoCartaoForm';
import { confirmarTransacaoCartao, pagarFatura } from '../cartoes/actions';
import { deleteTransacao, desconfirmarTransacao } from './actions';
import { DateInput } from '@mantine/dates';
import { SearchableSelect } from '@/components/SearchableSelect';

type FaturaCompleta = FaturaCartao & {
  cartao: Cartao & { contaBancaria: ContaBancaria };
  transacoes: (Transacao & {
    conta?: (Conta & { categoria: Categoria }) | null;
    caixinha?: Caixinha | null;
  })[];
  contaBancariaPagto?: ContaBancaria | null;
};

interface CartoesCreditoTabProps {
  faturas: FaturaCompleta[];
  cartoes: Cartao[];
  contas: (Conta & { categoria: Categoria })[];
  contasBancarias: ContaBancaria[];
  mes: number;
  ano: number;
  onRecarregar: () => void;
}

export function CartoesCreditoTab({
  faturas,
  cartoes,
  contas,
  contasBancarias,
  mes,
  ano,
  onRecarregar
}: CartoesCreditoTabProps) {
  const router = useRouter();
  const [faturaExpandida, setFaturaExpandida] = useState<string | null>(null);
  const [transacaoModalOpen, setTransacaoModalOpen] = useState(false);
  const [cartaoSelecionado, setCartaoSelecionado] = useState<string>('');
  const [pagamentoAberto, setPagamentoAberto] = useState<string | null>(null);
  const [contaBancariaPagto, setContaBancariaPagto] = useState('');
  const [dataPagamento, setDataPagamento] = useState<Date | null>(new Date());
  const [valorPago, setValorPago] = useState(0);

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
    onRecarregar();
  };

  const handlePagarFatura = async (faturaId: string) => {
    if (!contaBancariaPagto || !dataPagamento) return;
    
    await pagarFatura(faturaId, contaBancariaPagto, dataPagamento, valorPago);
    setPagamentoAberto(null);
    setContaBancariaPagto('');
    onRecarregar();
  };

  const contaBancariaOptions = contasBancarias.map(cb => ({
    value: cb.id,
    label: `${cb.nomeConta} - ${cb.nomeBanco}`
  }));

  return (
    <Stack gap="md">
      {/* Grid de Cartões com Resumo */}
      <Grid>
        {faturas.map((fatura) => {
          const totalPendente = fatura.transacoes
            .filter(t => t.status === 'pendente')
            .reduce((acc, t) => acc + (t.valorEsperado || t.valor), 0);
          
          const totalConfirmado = fatura.transacoes
            .filter(t => t.status === 'confirmado')
            .reduce((acc, t) => acc + t.valor, 0);

          return (
            <Grid.Col key={fatura.id} span={{ base: 12, md: 6, lg: 4 }}>
              <Card 
                shadow="sm" 
                padding="md" 
                radius="md" 
                withBorder
                style={{ cursor: 'pointer' }}
                onClick={() => setFaturaExpandida(faturaExpandida === fatura.id ? null : fatura.id)}
              >
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Group gap="xs">
                      <IconCreditCard size={24} />
                      <div>
                        <Text fw={600}>{fatura.cartao.nome}</Text>
                        <Text size="xs" c="dimmed">{fatura.cartao.contaBancaria.nomeConta}</Text>
                      </div>
                    </Group>
                    <Badge color={fatura.status === 'pago' ? 'green' : 'yellow'}>
                      {fatura.status === 'pago' ? 'Paga' : 'Aberta'}
                    </Badge>
                  </Group>

                  <div>
                    <Text size="xs" c="dimmed">Total da Fatura</Text>
                    <Text size="xl" fw={700} c={fatura.status === 'pago' ? 'green' : 'red'}>
                      {formatCurrency(fatura.valorTotal)}
                    </Text>
                  </div>

                  <Group grow>
                    <div>
                      <Text size="xs" c="dimmed">Pendente</Text>
                      <Text size="sm" c="orange">{formatCurrency(totalPendente)}</Text>
                    </div>
                    <div>
                      <Text size="xs" c="dimmed">Confirmado</Text>
                      <Text size="sm" c="blue">{formatCurrency(totalConfirmado)}</Text>
                    </div>
                  </Group>


                </Stack>
              </Card>
            </Grid.Col>
          );
        })}
      </Grid>

      {/* Detalhes da Fatura Expandida */}
      {faturaExpandida && (() => {
        const fatura = faturas.find(f => f.id === faturaExpandida);
        if (!fatura) return null;

        return (
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between" align="center">
                <Text fw={600} size="lg">{fatura.cartao.nome} - Transações</Text>
                <Group>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCartaoSelecionado(fatura.cartaoId);
                      setTransacaoModalOpen(true);
                    }}
                  >
                    Nova Transação
                  </Button>
                  <Button
                    color={fatura.status === 'pago' ? 'blue' : 'green'}
                    leftSection={<IconCash size={16} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPagamentoAberto(fatura.id);
                      if (fatura.status === 'pago') {
                        // Preencher com dados existentes
                        setContaBancariaPagto(fatura.contaBancariaPagtoId || fatura.cartao.contaBancariaId);
                        setDataPagamento(fatura.dataPagamento || new Date());
                        setValorPago(fatura.valorPago || fatura.valorTotal);
                      } else {
                        // Preencher com banco do cartão por padrão
                        setContaBancariaPagto(fatura.cartao.contaBancariaId);
                        setDataPagamento(new Date());
                        setValorPago(fatura.valorTotal);
                      }
                    }}
                  >
                    {fatura.status === 'pago' ? 'Editar Pagamento' : 'Pagar Fatura'}
                  </Button>
                </Group>
              </Group>

              {/* Formulário de Pagamento */}
              {pagamentoAberto === fatura.id && (
                <Paper p="md" withBorder bg="gray.0">
                  <Stack gap="md">
                    <Text fw={600}>{fatura.status === 'pago' ? 'Editar' : 'Pagar'} Fatura</Text>
                    <Group grow align="flex-start">
                      <SearchableSelect
                        label="Conta Bancária"
                        placeholder="Selecione a conta"
                        data={contaBancariaOptions}
                        value={contaBancariaPagto}
                        onChange={(value) => setContaBancariaPagto(value || '')}
                      />
                      <DateInput
                        label="Data do Pagamento"
                        value={dataPagamento}
                        onChange={(value) => setDataPagamento(value ? new Date(value) : null)}
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
                      <Button 
                        onClick={() => handlePagarFatura(fatura.id)} 
                        disabled={!contaBancariaPagto}
                      >
                        Confirmar Pagamento
                      </Button>
                      <Button 
                        variant="subtle" 
                        onClick={() => setPagamentoAberto(null)}
                      >
                        Cancelar
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              )}

              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Data</Table.Th>
                    <Table.Th>Descrição</Table.Th>
                    <Table.Th>Categoria</Table.Th>
                    <Table.Th>Previsto</Table.Th>
                    <Table.Th>Real</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Ações</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {fatura.transacoes.map((transacao) => (
                    <Table.Tr key={transacao.id}>
                      <Table.Td>{formatDate(transacao.data)}</Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>{transacao.descricao}</Text>
                        {transacao.observacao && (
                          <Text size="xs" c="dimmed">{transacao.observacao}</Text>
                        )}
                      </Table.Td>
                      <Table.Td>{transacao.conta?.categoria.nome}</Table.Td>
                      <Table.Td>
                        <Text c="dimmed">
                          {transacao.valorEsperado ? formatCurrency(transacao.valorEsperado) : '-'}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500}>{formatCurrency(transacao.valor)}</Text>
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
                        <Group gap={4} wrap="nowrap">
                          {transacao.status === 'pendente' ? (
                            <ConfirmarTransacaoInline
                              transacaoId={transacao.id}
                              valorEsperado={transacao.valorEsperado || transacao.valor}
                              onConfirmar={handleConfirmarTransacao}
                            />
                          ) : (
                            <Tooltip label="Desconfirmar">
                              <ActionIcon
                                size="sm"
                                color="orange"
                                variant="subtle"
                                onClick={async () => {
                                  await desconfirmarTransacao(transacao.id);
                                  onRecarregar();
                                }}
                              >
                                <IconX size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                          <Tooltip label="Excluir">
                            <ActionIcon
                              size="sm"
                              color="red"
                              variant="subtle"
                              onClick={() => {
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
                                    onRecarregar();
                                  },
                                });
                              }}
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

              {fatura.transacoes.length === 0 && (
                <Text ta="center" c="dimmed" py="xl">
                  Nenhuma transação nesta fatura
                </Text>
              )}
            </Stack>
          </Paper>
        );
      })()}

      <TransacaoCartaoForm
        opened={transacaoModalOpen}
        onClose={() => {
          setTransacaoModalOpen(false);
          setCartaoSelecionado('');
          onRecarregar();
        }}
        cartaoId={cartaoSelecionado}
        contas={contas}
        contasBancarias={contasBancarias}
        mes={mes}
        ano={ano}
      />
    </Stack>
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
