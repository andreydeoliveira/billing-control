'use client';

import { Table, Text, Paper, Stack, Modal, Group } from '@mantine/core';
import { useState } from 'react';

interface ContaBancaria {
  id: string;
  nomeConta: string;
  saldo: number;
}

interface Caixinha {
  id: string;
  nome: string;
  saldo: number;
  contaBancaria: ContaBancaria;
}

interface Transacao {
  id: string;
  data: Date;
  valor: number;
  valorEsperado: number | null;
  tipo: string;
  status: string;
  descricao: string;
  caixinhaId?: string | null;
  contaBancaria: {
    id: string;
  } | null;
  contaBancariaOrigemId?: string | null;
  contaBancariaDestinoId?: string | null;
  gastoProvisionadoId?: string | null;
}

interface PrevisaoClientProps {
  contasBancarias: ContaBancaria[];
  caixinhas: Caixinha[];
  transacoes: Transacao[];
  mesAtual: number;
  anoAtual: number;
}

type ProjecaoMensal = {
  [contaId: string]: number[];
};

type DetalheMensal = {
  mes: number;
  ano: number;
  receitas: Array<{ descricao: string; valor: number; tipo: string; nomeConta: string }>;
  despesas: Array<{ descricao: string; valor: number; tipo: string; nomeConta: string }>;
  saldoInicial: number;
  saldoFinal: number;
};

type DetalhesPorConta = {
  [contaId: string]: DetalheMensal[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function getMonthKey(mes: number, ano: number) {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[mes - 1]}/${ano}`;
}

export default function PrevisaoClient({
  contasBancarias,
  caixinhas,
  transacoes,
  mesAtual,
  anoAtual,
}: PrevisaoClientProps) {
  const [modalAberto, setModalAberto] = useState(false);
  const [detalhesSelecionado, setDetalhesSelecionado] = useState<DetalheMensal | null>(null);
  const [nomeConta, setNomeConta] = useState('');
  const [isCaixinha, setIsCaixinha] = useState(false);

  // Gerar array de 12 meses a partir do mês atual
  const mesesFuturos = Array.from({ length: 12 }, (_, i) => {
    const mes = ((mesAtual + i - 1) % 12) + 1;
    const ano = anoAtual + Math.floor((mesAtual + i - 1) / 12);
    return { mes, ano, label: getMonthKey(mes, ano) };
  });

  const meses = mesesFuturos;

  // Calcular projeções para cada conta
  const projecaoContas: ProjecaoMensal = {};
  const detalhesContas: DetalhesPorConta = {};

  contasBancarias.forEach(conta => {
    const saldos: number[] = [];
    const detalhes: DetalheMensal[] = [];
    let saldoAnterior = conta.saldo;

    for (let i = 0; i < 12; i++) {
      const { mes: m, ano: a } = mesesFuturos[i];
      const ehMesAtual = m === mesAtual && a === anoAtual;
      
      // Filtrar transações deste mês e desta conta
      const transacoesMes = transacoes.filter(t => {
        const dataTrans = new Date(t.data);
        const mesT = dataTrans.getMonth() + 1;
        const anoT = dataTrans.getFullYear();
        
        // Incluir: receitas/despesas desta conta OU transferências que envolvem esta conta
        const mesAnoCorreto = mesT === m && anoT === a;
        
        if (!mesAnoCorreto) return false;
        
        // Receita/despesa normal desta conta
        if (t.contaBancaria && t.contaBancaria.id === conta.id && t.tipo !== 'transferencia') {
          return true;
        }
        
        // Transferências não devem aparecer aqui - são processadas separadamente
        return false;
      });
      
      // Buscar transferências que afetam esta conta (saída ou entrada)
      const transferenciasQueAfetamConta = transacoes.filter(t => {
        const dataTrans = new Date(t.data);
        const mesT = dataTrans.getMonth() + 1;
        const anoT = dataTrans.getFullYear();
        
        if (mesT !== m || anoT !== a || t.tipo !== 'transferencia') return false;
        
        // Transferências para caixinha (origem = conta, destino = null, caixinhaId preenchido)
        if (t.contaBancariaOrigemId === conta.id && t.caixinhaId) {
          return true; // Saída da conta para caixinha
        }
        
        // Transferências de caixinha (origem = null, destino = conta, caixinhaId preenchido)
        if (t.contaBancariaDestinoId === conta.id && t.caixinhaId) {
          return true; // Entrada na conta vindo de caixinha
        }
        
        // Transferências entre contas (sem caixinha)
        if (!t.caixinhaId) {
          if (t.contaBancariaOrigemId === conta.id || t.contaBancariaDestinoId === conta.id) {
            return true;
          }
        }
        
        return false;
      });

      const receitasDetalhadas: Array<{ descricao: string; valor: number; tipo: string; nomeConta: string }> = [];
      const despesasDetalhadas: Array<{ descricao: string; valor: number; tipo: string; nomeConta: string }> = [];

      let receitasMes = 0;
      let despesasMes = 0;

      // Processar transações confirmadas e pendentes (receitas/despesas normais)
      // No mês atual: só conta pendentes (confirmados já estão no saldo)
      // Nos próximos meses: conta tudo
      transacoesMes.forEach(t => {
        // Se é mês atual e está confirmado, pular (já está no saldo)
        if (ehMesAtual && t.status === 'confirmado') {
          return;
        }
        
        const valorUsado = t.status === 'confirmado' ? t.valor : (t.valorEsperado || t.valor);
        const tipoLabel = t.status === 'confirmado' ? 'Confirmado' : 'Pendente';
        
        if (t.tipo === 'receita') {
          receitasMes += valorUsado;
          receitasDetalhadas.push({ 
            descricao: t.descricao, 
            valor: valorUsado, 
            tipo: tipoLabel,
            nomeConta: 'Transação Manual'
          });
        } else if (t.tipo === 'despesa') {
          despesasMes += valorUsado;
          despesasDetalhadas.push({ 
            descricao: t.descricao, 
            valor: valorUsado, 
            tipo: tipoLabel,
            nomeConta: 'Transação Manual'
          });
        }
      });
      
      // Processar transferências (impactam o saldo mas não aparecem como receita/despesa)
      // No mês atual: só conta pendentes (confirmadas já estão no saldo)
      transferenciasQueAfetamConta.forEach(t => {
        // Se é mês atual e está confirmado, pular (já está no saldo)
        if (ehMesAtual && t.status === 'confirmado') {
          return;
        }
        
        const valorUsado = t.status === 'confirmado' ? t.valor : (t.valorEsperado || t.valor);
        
        // Se a conta é origem, é uma saída (despesa)
        if (t.contaBancariaOrigemId === conta.id) {
          despesasMes += valorUsado;
          despesasDetalhadas.push({ 
            descricao: t.descricao, 
            valor: valorUsado, 
            tipo: t.status === 'confirmado' ? 'Transferência' : 'Transf. Pendente',
            nomeConta: t.caixinhaId ? 'Aporte em Caixinha' : 'Transferência'
          });
        }
        // Se a conta é destino, é uma entrada (receita)
        else if (t.contaBancariaDestinoId === conta.id) {
          receitasMes += valorUsado;
          receitasDetalhadas.push({ 
            descricao: t.descricao, 
            valor: valorUsado, 
            tipo: t.status === 'confirmado' ? 'Transferência' : 'Transf. Pendente',
            nomeConta: t.caixinhaId ? 'Resgate de Caixinha' : 'Transferência'
          });
        }
      });

      const saldoAtual = saldoAnterior + receitasMes - despesasMes;
      saldos.push(saldoAtual);

      detalhes.push({
        mes: m,
        ano: a,
        receitas: receitasDetalhadas,
        despesas: despesasDetalhadas,
        saldoInicial: saldoAnterior,
        saldoFinal: saldoAtual
      });

      saldoAnterior = saldoAtual;
    }

    projecaoContas[conta.id] = saldos;
    detalhesContas[conta.id] = detalhes;
  });

  // Calcular projeções para caixinhas
  const projecaoCaixinhas: ProjecaoMensal = {};
  const detalhesCaixinhas: DetalhesPorConta = {};

  caixinhas.forEach(caixinha => {
    const saldos: number[] = [];
    const detalhes: DetalheMensal[] = [];
    let saldoAnterior = caixinha.saldo;

    for (let i = 0; i < 12; i++) {
      const { mes: m, ano: a } = mesesFuturos[i];
      const ehMesAtual = m === mesAtual && a === anoAtual;
      
      // Filtrar transações com caixinhaId (confirmadas e pendentes)
      const transacoesMes = transacoes.filter(t => {
        const dataTrans = new Date(t.data);
        const mesT = dataTrans.getMonth() + 1;
        const anoT = dataTrans.getFullYear();
        
        if (mesT !== m || anoT !== a) return false;
        
        // Incluir transações que têm caixinhaId
        if (t.caixinhaId === caixinha.id) {
          // Se é mês atual e está confirmado, pular (já está no saldo)
          if (ehMesAtual && t.status === 'confirmado') {
            return false;
          }
          return true;
        }
        
        return false;
      });

      const aportesDetalhados: Array<{ descricao: string; valor: number; tipo: string; nomeConta: string }> = [];
      const resgatesDetalhados: Array<{ descricao: string; valor: number; tipo: string; nomeConta: string }> = [];

      let aportesMes = 0;
      let resgatesMes = 0;

      transacoesMes.forEach(t => {
        const valorUsado = t.status === 'confirmado' ? t.valor : (t.valorEsperado || t.valor);
        const tipoLabel = t.status === 'confirmado' ? 'Confirmado' : 'Pendente';
        
        // Identificar aportes vs resgates pela descrição ou origem/destino
        // Aporte: tem contaBancariaOrigemId (conta -> caixinha)
        // Resgate: tem contaBancariaDestinoId (caixinha -> conta)
        if (t.contaBancariaOrigemId) {
          // Aporte
          aportesMes += valorUsado;
          aportesDetalhados.push({ 
            descricao: t.descricao, 
            valor: valorUsado, 
            tipo: tipoLabel,
            nomeConta: 'Aporte'
          });
        } else if (t.contaBancariaDestinoId) {
          // Resgate
          resgatesMes += valorUsado;
          resgatesDetalhados.push({ 
            descricao: t.descricao, 
            valor: valorUsado, 
            tipo: tipoLabel,
            nomeConta: 'Resgate'
          });
        }
      });

      const saldoAtual = saldoAnterior + aportesMes - resgatesMes;
      saldos.push(saldoAtual);

      detalhes.push({
        mes: m,
        ano: a,
        receitas: aportesDetalhados,
        despesas: resgatesDetalhados,
        saldoInicial: saldoAnterior,
        saldoFinal: saldoAtual
      });

      saldoAnterior = saldoAtual;
    }

    projecaoCaixinhas[caixinha.id] = saldos;
    detalhesCaixinhas[caixinha.id] = detalhes;
  });

  return (
    <Stack gap="xl" p="md">
      <Text size="xl" fw={700}>Previsão Orçamentária - Próximos 12 Meses</Text>

      {/* Modal de Detalhes */}
      <Modal
        opened={modalAberto}
        onClose={() => setModalAberto(false)}
        title={`Detalhes - ${nomeConta} - ${detalhesSelecionado ? getMonthKey(detalhesSelecionado.mes, detalhesSelecionado.ano) : ''}`}
        size="xl"
      >
        {detalhesSelecionado && (
          <Stack gap="lg">
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="xs" c="dimmed" mb={4}>Saldo Inicial</Text>
                  <Text size="lg" fw={700} c={detalhesSelecionado.saldoInicial >= 0 ? 'green' : 'red'}>
                    {formatCurrency(detalhesSelecionado.saldoInicial)}
                  </Text>
                </div>
                <div>
                  <Text size="xs" c="dimmed" mb={4}>Saldo Final</Text>
                  <Text size="lg" fw={700} c={detalhesSelecionado.saldoFinal >= 0 ? 'green' : 'red'}>
                    {formatCurrency(detalhesSelecionado.saldoFinal)}
                  </Text>
                </div>
              </Group>
            </Paper>

            {/* Receitas */}
            {detalhesSelecionado.receitas.length > 0 && (
              <Paper p="md" withBorder>
                <Text size="lg" fw={600} c="green" mb="md">
                  {isCaixinha ? 'Aportes' : 'Receitas'}
                </Text>
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Descrição</Table.Th>
                      <Table.Th>Conta</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th ta="right">Valor</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {detalhesSelecionado.receitas.map((r, idx) => (
                      <Table.Tr key={idx}>
                        <Table.Td>
                          <Text size="sm">{r.descricao}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>{r.nomeConta}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">{r.tipo}</Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text size="sm" fw={600} c="green">{formatCurrency(r.valor)}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                    <Table.Tr style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                      <Table.Td colSpan={3}>
                        <Text fw={700} size="sm">
                          {isCaixinha ? 'Total Aportes' : 'Total Receitas'}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text fw={700} c="green" size="md">
                          {formatCurrency(detalhesSelecionado.receitas.reduce((sum, r) => sum + r.valor, 0))}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  </Table.Tbody>
                </Table>
              </Paper>
            )}

            {/* Despesas */}
            {detalhesSelecionado.despesas.length > 0 && (
              <Paper p="md" withBorder>
                <Text size="lg" fw={600} c="red" mb="md">
                  {isCaixinha ? 'Resgates' : 'Despesas'}
                </Text>
                <Table highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Descrição</Table.Th>
                      <Table.Th>Conta</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th ta="right">Valor</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {detalhesSelecionado.despesas.map((d, idx) => (
                      <Table.Tr key={idx}>
                        <Table.Td>
                          <Text size="sm">{d.descricao}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>{d.nomeConta}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">{d.tipo}</Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text size="sm" fw={600} c="red">{formatCurrency(d.valor)}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                    <Table.Tr style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}>
                      <Table.Td colSpan={3}>
                        <Text fw={700} size="sm">
                          {isCaixinha ? 'Total Resgates' : 'Total Despesas'}
                        </Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text fw={700} c="red" size="md">
                          {formatCurrency(detalhesSelecionado.despesas.reduce((sum, d) => sum + d.valor, 0))}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  </Table.Tbody>
                </Table>
              </Paper>
            )}
          </Stack>
        )}
      </Modal>

      {/* Contas Bancárias */}
      <Paper shadow="xs" p="md" withBorder>
        <Text size="lg" fw={600} mb="md">Contas Bancárias</Text>
        <div style={{ overflowX: 'auto' }}>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Conta</Table.Th>
                <Table.Th>Atual</Table.Th>
                {meses.map((m, idx) => (
                  <Table.Th key={idx}>{m.label}</Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {contasBancarias.map(conta => (
                <Table.Tr key={conta.id}>
                  <Table.Td>
                    <Text fw={500}>{conta.nomeConta}</Text>
                  </Table.Td>
                  <Table.Td
                    onDoubleClick={() => {
                      setDetalhesSelecionado({
                        mes: mesAtual,
                        ano: anoAtual,
                        receitas: [],
                        despesas: [],
                        saldoInicial: conta.saldo,
                        saldoFinal: conta.saldo
                      });
                      setNomeConta(conta.nomeConta);
                      setIsCaixinha(false);
                      setModalAberto(true);
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <Text fw={700} c={conta.saldo >= 0 ? 'green' : 'red'}>
                      {formatCurrency(conta.saldo)}
                    </Text>
                  </Table.Td>
                  {projecaoContas[conta.id]?.map((saldo, idx) => (
                    <Table.Td 
                      key={idx}
                      onDoubleClick={() => {
                        setDetalhesSelecionado(detalhesContas[conta.id][idx]);
                        setNomeConta(conta.nomeConta);
                        setIsCaixinha(false);
                        setModalAberto(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <Text fw={500} c={saldo >= 0 ? 'green' : 'red'}>
                        {formatCurrency(saldo)}
                      </Text>
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </div>
      </Paper>

      {/* Caixinhas */}
      {caixinhas.length > 0 && (
        <Paper shadow="xs" p="md" withBorder>
          <Text size="lg" fw={600} mb="md">Caixinhas</Text>
          <div style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover withTableBorder>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Caixinha</Table.Th>
                  <Table.Th>Conta</Table.Th>
                  <Table.Th>Atual</Table.Th>
                  {meses.map((m, idx) => (
                    <Table.Th key={idx}>{m.label}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {caixinhas.map(caixinha => (
                  <Table.Tr key={caixinha.id}>
                    <Table.Td>
                      <Text fw={500}>{caixinha.nome}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{caixinha.contaBancaria.nomeConta}</Text>
                    </Table.Td>
                    <Table.Td
                      onDoubleClick={() => {
                        setDetalhesSelecionado({
                          mes: mesAtual,
                          ano: anoAtual,
                          receitas: [],
                          despesas: [],
                          saldoInicial: caixinha.saldo,
                          saldoFinal: caixinha.saldo
                        });
                        setNomeConta(caixinha.nome);
                        setIsCaixinha(true);
                        setModalAberto(true);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <Text fw={700} c={caixinha.saldo >= 0 ? 'green' : 'red'}>
                        {formatCurrency(caixinha.saldo)}
                      </Text>
                    </Table.Td>
                    {projecaoCaixinhas[caixinha.id]?.map((saldo, idx) => (
                      <Table.Td 
                        key={idx}
                        onDoubleClick={() => {
                          setDetalhesSelecionado(detalhesCaixinhas[caixinha.id][idx]);
                          setNomeConta(caixinha.nome);
                          setIsCaixinha(true);
                          setModalAberto(true);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <Text fw={500} c={saldo >= 0 ? 'green' : 'red'}>
                          {formatCurrency(saldo)}
                        </Text>
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </div>
        </Paper>
      )}
    </Stack>
  );
}
