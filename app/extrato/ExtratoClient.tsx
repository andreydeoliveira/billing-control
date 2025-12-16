'use client';

import { Paper, Stack, Title, Select, Table, Text, Group, Badge, NumberFormatter, Button, Alert } from '@mantine/core';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getExtratoLancamentos, recalcularTodosSaldos, limparTransacoes } from './actions';
import { IconRefresh, IconTrash, IconAlertCircle } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';

interface ContaBancaria {
  id: string;
  nomeConta: string;
  nomeBanco: string;
  saldo: number;
  saldoInicial: number;
}

interface Caixinha {
  id: string;
  nome: string;
  saldo: number;
  contaBancaria: ContaBancaria;
}

interface LancamentoExtrato {
  id: string;
  descricao: string;
  saldoAnterior: number;
  valorMovimento: number;
  saldoNovo: number;
  tipo: string;
  data: Date;
  createdAt: Date;
}

interface ExtratoClientProps {
  contasBancarias: ContaBancaria[];
  caixinhas: Caixinha[];
}

export default function ExtratoClient({ contasBancarias, caixinhas }: ExtratoClientProps) {
  const router = useRouter();
  const [tipoEntidade, setTipoEntidade] = useState<'contaBancaria' | 'caixinha'>('contaBancaria');
  const [entidadeSelecionada, setEntidadeSelecionada] = useState<string>('');
  const [lancamentos, setLancamentos] = useState<LancamentoExtrato[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingRecalculo, setLoadingRecalculo] = useState(false);
  const [loadingLimpeza, setLoadingLimpeza] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'success' | 'error'; texto: string } | null>(null);
  const [verificacao, setVerificacao] = useState<{
    saldoAtual: number;
    saldoCalculado: number;
    divergencia: number;
    totalLancamentos: number;
  } | null>(null);

  // Selecionar primeira entidade automaticamente
  useEffect(() => {
    if (contasBancarias.length > 0 && !entidadeSelecionada) {
      setEntidadeSelecionada(contasBancarias[0].id);
    }
  }, [contasBancarias, entidadeSelecionada]);

  // Carregar extrato quando entidade mudar
  useEffect(() => {
    if (!entidadeSelecionada) return;

    const carregarExtrato = async () => {
      setLoading(true);
      try {
        const data = await getExtratoLancamentos(entidadeSelecionada, tipoEntidade);
        setLancamentos(data.lancamentos || []);
        setVerificacao(data.verificacao || null);
      } catch (error) {
        console.error('Erro ao carregar extrato:', error);
      } finally {
        setLoading(false);
      }
    };

    carregarExtrato();
  }, [entidadeSelecionada, tipoEntidade]);

  const entidadeOptions = tipoEntidade === 'contaBancaria'
    ? contasBancarias.map(cb => ({
        value: cb.id,
        label: `${cb.nomeConta} - ${cb.nomeBanco}`
      }))
    : caixinhas.map(c => ({
        value: c.id,
        label: `${c.nome} (${c.contaBancaria.nomeConta})`
      }));

  const entidadeAtual = tipoEntidade === 'contaBancaria'
    ? contasBancarias.find(cb => cb.id === entidadeSelecionada)
    : caixinhas.find(c => c.id === entidadeSelecionada);

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'receita': return 'green';
      case 'despesa': return 'red';
      case 'transferencia_saida': return 'orange';
      case 'transferencia_entrada': return 'blue';
      case 'aporte': return 'cyan';
      case 'resgate': return 'grape';
      default: return 'gray';
    }
  };

  const handleRecalcularSaldos = async () => {
    setLoadingRecalculo(true);
    setMensagem(null);
    try {
      const resultado = await recalcularTodosSaldos();
      if (resultado.sucesso) {
        setMensagem({ 
          tipo: 'success', 
          texto: `${resultado.totalCorrigido} saldo(s) corrigido(s):\n${resultado.correcoes.join('\n')}` 
        });
        router.refresh();
        // Recarregar extrato atual
        if (entidadeSelecionada) {
          const data = await getExtratoLancamentos(entidadeSelecionada, tipoEntidade);
          setLancamentos(data.lancamentos || []);
          setVerificacao(data.verificacao || null);
        }
      } else {
        setMensagem({ tipo: 'error', texto: `Erros: ${resultado.erros.join(', ')}` });
      }
    } catch (error) {
      setMensagem({ tipo: 'error', texto: `Erro ao recalcular: ${error}` });
    } finally {
      setLoadingRecalculo(false);
    }
  };

  const handleLimparTransacoes = async () => {
    if (!confirm('ATENÇÃO: Isso vai deletar TODAS as transações, faturas e lançamentos do extrato. Os cadastros (contas, categorias, etc) serão mantidos. Deseja continuar?')) {
      return;
    }
    
    setLoadingLimpeza(true);
    setMensagem(null);
    try {
      const resultado = await limparTransacoes();
      if (resultado.sucesso) {
        setMensagem({ tipo: 'success', texto: resultado.mensagem });
        router.refresh();
        setLancamentos([]);
        setVerificacao(null);
      } else {
        setMensagem({ tipo: 'error', texto: resultado.mensagem });
      }
    } catch (error) {
      setMensagem({ tipo: 'error', texto: `Erro ao limpar: ${error}` });
    } finally {
      setLoadingLimpeza(false);
    }
  };

  return (
    <Stack gap="md" p="md" pt={0}>
      <Group justify="space-between" align="center">
        <Title order={2}>Extrato Bancário / Auditoria</Title>
        <Group>
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={handleRecalcularSaldos}
            loading={loadingRecalculo}
            color="blue"
            variant="light"
          >
            Recalcular Saldos
          </Button>
          <Button
            leftSection={<IconTrash size={16} />}
            onClick={handleLimparTransacoes}
            loading={loadingLimpeza}
            color="red"
            variant="light"
          >
            Limpar Transações
          </Button>
        </Group>
      </Group>

      {mensagem && (
        <Alert
          color={mensagem.tipo === 'success' ? 'green' : 'red'}
          title={mensagem.tipo === 'success' ? 'Sucesso' : 'Erro'}
          icon={<IconAlertCircle />}
          withCloseButton
          onClose={() => setMensagem(null)}
          style={{ whiteSpace: 'pre-line' }}
        >
          {mensagem.texto}
        </Alert>
      )}

      <Paper p="md" withBorder>
        <Stack gap="md">
          <Group grow>
            <Select
              label="Tipo"
              value={tipoEntidade}
              onChange={(value) => {
                setTipoEntidade(value as 'contaBancaria' | 'caixinha');
                setEntidadeSelecionada('');
              }}
              data={[
                { value: 'contaBancaria', label: 'Conta Bancária' },
                { value: 'caixinha', label: 'Caixinha' }
              ]}
            />

            <Select
              label={tipoEntidade === 'contaBancaria' ? 'Conta Bancária' : 'Caixinha'}
              placeholder="Selecione..."
              value={entidadeSelecionada}
              onChange={(value) => setEntidadeSelecionada(value || '')}
              data={entidadeOptions}
              searchable
            />
          </Group>

          {entidadeAtual && verificacao && (
            <Paper p="md" withBorder bg="gray.0">
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text fw={500}>Saldo Atual (em cache):</Text>
                  <NumberFormatter
                    value={verificacao.saldoAtual}
                    prefix="R$ "
                    thousandSeparator="."
                    decimalSeparator=","
                    decimalScale={2}
                    fixedDecimalScale
                  />
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>Saldo Calculado (do extrato):</Text>
                  <NumberFormatter
                    value={verificacao.saldoCalculado}
                    prefix="R$ "
                    thousandSeparator="."
                    decimalSeparator=","
                    decimalScale={2}
                    fixedDecimalScale
                  />
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>Divergência:</Text>
                  <Text c={verificacao.divergencia === 0 ? 'green' : 'red'} fw={700}>
                    {verificacao.divergencia === 0 ? '✓ OK' : 
                      `${verificacao.divergencia > 0 ? '+' : '-'} R$ ${Math.abs(verificacao.divergencia).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
                    }
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text fw={500}>Total de Lançamentos:</Text>
                  <Text>{verificacao.totalLancamentos}</Text>
                </Group>
                {tipoEntidade === 'contaBancaria' && 'saldoInicial' in entidadeAtual && (
                  <Group justify="space-between">
                    <Text fw={500}>Saldo Inicial:</Text>
                    <NumberFormatter
                      value={entidadeAtual.saldoInicial}
                      prefix="R$ "
                      thousandSeparator="."
                      decimalSeparator=","
                      decimalScale={2}
                      fixedDecimalScale
                    />
                  </Group>
                )}
              </Stack>
            </Paper>
          )}
        </Stack>
      </Paper>

      <Paper p="md" withBorder>
        {loading ? (
          <Text>Carregando extrato...</Text>
        ) : lancamentos.length === 0 ? (
          <Text c="dimmed">Nenhum lançamento encontrado</Text>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Data</Table.Th>
                <Table.Th>Descrição</Table.Th>
                <Table.Th>Tipo</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Saldo Anterior</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Movimento</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>Saldo Novo</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {lancamentos.map((lanc) => (
                <Table.Tr key={lanc.id}>
                  <Table.Td>
                    <Text size="sm">
                      {format(new Date(lanc.data), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{lanc.descricao}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color={getTipoBadgeColor(lanc.tipo)} size="sm">
                      {lanc.tipo}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <NumberFormatter
                      value={lanc.saldoAnterior}
                      prefix="R$ "
                      thousandSeparator="."
                      decimalSeparator=","
                      decimalScale={2}
                      fixedDecimalScale
                    />
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text c={lanc.valorMovimento >= 0 ? 'green' : 'red'} fw={500}>
                      {lanc.valorMovimento >= 0 ? '+' : '-'} R$ {Math.abs(lanc.valorMovimento).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text fw={600}>
                      <NumberFormatter
                        value={lanc.saldoNovo}
                        prefix="R$ "
                        thousandSeparator="."
                        decimalSeparator=","
                        decimalScale={2}
                        fixedDecimalScale
                      />
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Paper>
    </Stack>
  );
}
