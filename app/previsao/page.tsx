import { prisma } from '@/lib/prisma';
import PrevisaoClient from './PrevisaoClient';

async function getPrevisaoData() {
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  // Buscar contas bancárias ativas
  const contasBancarias = await prisma.contaBancaria.findMany({
    where: { status: 'Ativo' },
    orderBy: { nomeConta: 'asc' }
  });

  // Buscar caixinhas ativas
  const caixinhas = await prisma.caixinha.findMany({
    where: { status: 'Ativo' },
    include: { contaBancaria: true },
    orderBy: { nome: 'asc' }
  });

  // Buscar transações existentes (confirmadas e pendentes)
  const transacoes = await prisma.transacao.findMany({
    include: {
      contaBancaria: true
    }
  });

  return {
    contasBancarias,
    caixinhas,
    transacoes,
    mesAtual,
    anoAtual
  };
}

export default async function PrevisaoPage() {
  const data = await getPrevisaoData();
  
  return <PrevisaoClient {...data} />;
}
