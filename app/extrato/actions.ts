'use server';

import { prisma } from '@/lib/prisma';

export async function getExtratoLancamentos(
  entidadeId: string,
  tipo: 'contaBancaria' | 'caixinha'
) {
  // Buscar lançamentos do extrato
  const lancamentos = await prisma.lancamentoExtrato.findMany({
    where: tipo === 'contaBancaria' 
      ? { contaBancariaId: entidadeId }
      : { caixinhaId: entidadeId },
    orderBy: [
      { data: 'desc' },
      { createdAt: 'desc' }
    ]
  });

  // Calcular verificação
  let saldoInicial = 0;
  let saldoAtual = 0;

  if (tipo === 'contaBancaria') {
    const conta = await prisma.contaBancaria.findUnique({
      where: { id: entidadeId }
    });
    if (conta) {
      saldoInicial = conta.saldoInicial;
      saldoAtual = conta.saldo;
    }
  } else {
    const caixinha = await prisma.caixinha.findUnique({
      where: { id: entidadeId }
    });
    if (caixinha) {
      saldoInicial = 0; // Caixinhas começam com zero
      saldoAtual = caixinha.saldo;
    }
  }

  // Calcular saldo do extrato
  let saldoCalculado = saldoInicial;
  const lancamentosOrdenados = [...lancamentos].reverse(); // Ordem crescente para calcular
  for (const lanc of lancamentosOrdenados) {
    saldoCalculado += lanc.valorMovimento;
  }

  return {
    lancamentos,
    verificacao: {
      saldoAtual,
      saldoCalculado,
      divergencia: saldoAtual - saldoCalculado,
      totalLancamentos: lancamentos.length
    }
  };
}

/**
 * Recalcula e corrige os saldos de todas as contas bancárias e caixinhas
 * baseado nos lançamentos do extrato
 */
export async function recalcularTodosSaldos() {
  const erros: string[] = [];
  const correcoes: string[] = [];

  // Recalcular contas bancárias
  const contasBancarias = await prisma.contaBancaria.findMany();
  
  for (const conta of contasBancarias) {
    try {
      // Buscar todos os lançamentos ordenados por data
      const lancamentos = await prisma.lancamentoExtrato.findMany({
        where: { contaBancariaId: conta.id },
        orderBy: [
          { data: 'asc' },
          { createdAt: 'asc' }
        ]
      });

      // Calcular saldo correto
      let saldoCalculado = conta.saldoInicial;
      for (const lanc of lancamentos) {
        saldoCalculado += lanc.valorMovimento;
      }

      // Verificar se precisa corrigir
      if (Math.abs(conta.saldo - saldoCalculado) > 0.01) {
        await prisma.contaBancaria.update({
          where: { id: conta.id },
          data: { saldo: saldoCalculado }
        });
        correcoes.push(`Conta ${conta.nomeConta}: ${conta.saldo.toFixed(2)} → ${saldoCalculado.toFixed(2)}`);
      }
    } catch (error) {
      erros.push(`Erro na conta ${conta.nomeConta}: ${error}`);
    }
  }

  // Recalcular caixinhas
  const caixinhas = await prisma.caixinha.findMany();
  
  for (const caixinha of caixinhas) {
    try {
      // Buscar todos os lançamentos ordenados por data
      const lancamentos = await prisma.lancamentoExtrato.findMany({
        where: { caixinhaId: caixinha.id },
        orderBy: [
          { data: 'asc' },
          { createdAt: 'asc' }
        ]
      });

      // Calcular saldo correto (caixinhas começam com 0)
      let saldoCalculado = 0;
      for (const lanc of lancamentos) {
        saldoCalculado += lanc.valorMovimento;
      }

      // Verificar se precisa corrigir
      if (Math.abs(caixinha.saldo - saldoCalculado) > 0.01) {
        await prisma.caixinha.update({
          where: { id: caixinha.id },
          data: { saldo: saldoCalculado }
        });
        correcoes.push(`Caixinha ${caixinha.nome}: ${caixinha.saldo.toFixed(2)} → ${saldoCalculado.toFixed(2)}`);
      }
    } catch (error) {
      erros.push(`Erro na caixinha ${caixinha.nome}: ${error}`);
    }
  }

  return {
    sucesso: erros.length === 0,
    correcoes,
    erros,
    totalCorrigido: correcoes.length
  };
}

/**
 * Limpa todas as transações e lançamentos do extrato
 * Mantém cadastros (contas, categorias, etc)
 */
export async function limparTransacoes() {
  try {
    // Deletar em ordem (respeitar foreign keys)
    await prisma.lancamentoExtrato.deleteMany();
    await prisma.mesExcluido.deleteMany();
    await prisma.transacao.deleteMany();
    await prisma.faturaCartao.deleteMany();

    // Resetar saldos das contas para o saldo inicial
    const contas = await prisma.contaBancaria.findMany();
    for (const conta of contas) {
      await prisma.contaBancaria.update({
        where: { id: conta.id },
        data: { saldo: conta.saldoInicial }
      });
    }

    // Resetar saldos das caixinhas para zero
    await prisma.caixinha.updateMany({
      data: { saldo: 0 }
    });

    return { sucesso: true, mensagem: 'Transações e extratos limpos com sucesso!' };
  } catch (error) {
    return { sucesso: false, mensagem: `Erro ao limpar: ${error}` };
  }
}
