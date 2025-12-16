'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// Criar transação no cartão
export async function createTransacaoCartao(formData: FormData) {
  const cartaoId = formData.get('cartaoId') as string;
  const data = new Date(formData.get('data') as string);
  const descricao = formData.get('descricao') as string;
  const valorEsperado = parseFloat(formData.get('valorEsperado') as string);
  const contaId = formData.get('contaId') as string;
  const observacao = (formData.get('observacao') as string) || null;

  const mes = data.getMonth() + 1;
  const ano = data.getFullYear();

  // Buscar ou criar fatura
  const cartao = await prisma.cartao.findUnique({ where: { id: cartaoId } });
  if (!cartao) throw new Error('Cartão não encontrado');

  const dataFechamento = new Date(ano, mes - 1, cartao.diaFechamento || 10);
  const dataVencimento = new Date(ano, mes - 1, cartao.diaVencimento || 15);

  let fatura = await prisma.faturaCartao.findUnique({
    where: { cartaoId_mes_ano: { cartaoId, mes, ano } }
  });

  if (!fatura) {
    fatura = await prisma.faturaCartao.create({
      data: {
        cartaoId,
        mes,
        ano,
        dataFechamento,
        dataVencimento,
        valorTotal: 0,
        status: 'aberta'
      }
    });
  }

  // Criar transação
  const transacao = await prisma.transacao.create({
    data: {
      data,
      mes,
      ano,
      descricao,
      valor: valorEsperado,
      valorEsperado,
      tipo: 'despesa',
      contaId,
      formaPagamento: 'cartao_credito',
      cartaoId,
      faturaCartaoId: fatura.id,
      status: 'pendente',
      observacao
    }
  });

  // Atualizar total da fatura
  await atualizarTotalFatura(fatura.id);

  revalidatePath('/cartoes');
  revalidatePath(`/cartoes/${cartaoId}`);
  
  return transacao;
}

// Confirmar transação do cartão (ajustar valor real)
export async function confirmarTransacaoCartao(transacaoId: string, valorReal: number) {
  const transacao = await prisma.transacao.update({
    where: { id: transacaoId },
    data: {
      valor: valorReal,
      status: 'confirmado'
    }
  });

  // Atualizar total da fatura
  if (transacao.faturaCartaoId) {
    await atualizarTotalFatura(transacao.faturaCartaoId);
  }

  revalidatePath('/cartoes');
  revalidatePath(`/cartoes/${transacao.cartaoId}`);
}

// Pagar fatura do cartão
export async function pagarFatura(
  faturaId: string,
  contaBancariaPagtoId: string,
  dataPagamento: Date,
  valorPago: number
) {
  const fatura = await prisma.faturaCartao.update({
    where: { id: faturaId },
    data: {
      status: 'pago',
      dataPagamento,
      valorPago,
      contaBancariaPagtoId
    }
  });

  // Criar transação de pagamento da fatura (pendente - usuário confirma depois)
  await prisma.transacao.create({
    data: {
      data: dataPagamento,
      mes: dataPagamento.getMonth() + 1,
      ano: dataPagamento.getFullYear(),
      descricao: `Pagamento Fatura ${fatura.mes}/${fatura.ano}`,
      valor: valorPago,
      tipo: 'despesa',
      formaPagamento: 'transferencia_pix',
      contaBancariaId: contaBancariaPagtoId,
      status: 'pendente',
      observacao: `Pagamento de fatura do cartão`
    }
  });
  
  // Obs: O saldo só será debitado quando o usuário confirmar essa transação

  // Marcar todas transações como confirmadas
  await prisma.transacao.updateMany({
    where: {
      faturaCartaoId: faturaId,
      status: 'pendente'
    },
    data: {
      status: 'confirmado'
    }
  });

  revalidatePath('/cartoes');
  revalidatePath('/transacoes');
}

// Atualizar total da fatura
async function atualizarTotalFatura(faturaId: string) {
  const transacoes = await prisma.transacao.findMany({
    where: { faturaCartaoId: faturaId }
  });

  const total = transacoes.reduce((acc, t) => {
    return acc + (t.status === 'confirmado' ? t.valor : t.valorEsperado || t.valor);
  }, 0);

  await prisma.faturaCartao.update({
    where: { id: faturaId },
    data: { valorTotal: total }
  });
}
