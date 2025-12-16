import { prisma } from '@/lib/prisma';
import { CartoesClient } from './CartoesClient';

export default async function CartoesPage() {
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  const cartoes = await prisma.cartao.findMany({
    where: { status: 'Ativo' },
    include: {
      contaBancaria: true
    },
    orderBy: { nome: 'asc' }
  });

  const contas = await prisma.conta.findMany({
    where: { status: 'Ativo' },
    include: { categoria: true },
    orderBy: { nome: 'asc' }
  });

  const contasBancarias = await prisma.contaBancaria.findMany({
    where: { status: 'Ativo' },
    orderBy: { nomeConta: 'asc' }
  });

  return (
    <CartoesClient
      cartoes={cartoes}
      contas={contas}
      contasBancarias={contasBancarias}
      mesInicial={mesAtual}
      anoInicial={anoAtual}
    />
  );
}
