import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const entidadeId = searchParams.get('entidadeId');
  const tipo = searchParams.get('tipo') as 'contaBancaria' | 'caixinha';

  if (!entidadeId || !tipo) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
  }

  try {
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
    for (const lanc of lancamentos.reverse()) { // Ordem crescente para calcular
      saldoCalculado += lanc.valorMovimento;
    }

    return NextResponse.json({
      lancamentos: lancamentos.reverse(), // Voltar para ordem decrescente
      verificacao: {
        saldoAtual,
        saldoCalculado,
        divergencia: saldoAtual - saldoCalculado,
        totalLancamentos: lancamentos.length
      }
    });
  } catch (error) {
    console.error('Erro ao buscar extrato:', error);
    return NextResponse.json({ error: 'Erro ao buscar extrato' }, { status: 500 });
  }
}
