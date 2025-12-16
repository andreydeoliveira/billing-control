import { prisma } from '@/lib/prisma';
import { CartaoDetalhesClient } from './CartaoDetalhesClient';
import { notFound } from 'next/navigation';

export default async function CartaoDetalhesPage({
  params,
  searchParams
}: {
  params: { id: string };
  searchParams: { mes?: string; ano?: string };
}) {
  const cartaoId = params.id;
  const hoje = new Date();
  const mes = searchParams.mes ? parseInt(searchParams.mes) : hoje.getMonth() + 1;
  const ano = searchParams.ano ? parseInt(searchParams.ano) : hoje.getFullYear();

  const cartao = await prisma.cartao.findUnique({
    where: { id: cartaoId },
    include: {
      contaBancaria: true
    }
  });

  if (!cartao) {
    notFound();
  }

  const fatura = await prisma.faturaCartao.findUnique({
    where: {
      cartaoId_mes_ano: { cartaoId, mes, ano }
    },
    include: {
      transacoes: {
        include: {
          conta: {
            include: {
              categoria: true
            }
          },
          caixinha: true
        },
        orderBy: { data: 'asc' }
      },
      contaBancariaPagto: true
    }
  });

  const contas = await prisma.conta.findMany({
    where: { 
      status: 'Ativo',
      tipo: 'despesa'
    },
    include: { categoria: true },
    orderBy: { nome: 'asc' }
  });

  const contasBancarias = await prisma.contaBancaria.findMany({
    where: { status: 'Ativo' },
    orderBy: { nomeConta: 'asc' }
  });

  return (
    <CartaoDetalhesClient
      cartao={cartao}
      fatura={fatura}
      contas={contas}
      contasBancarias={contasBancarias}
      mes={mes}
      ano={ano}
    />
  );
}
