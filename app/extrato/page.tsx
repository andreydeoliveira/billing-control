import { prisma } from '@/lib/prisma';
import ExtratoClient from './ExtratoClient';

async function getExtratoData() {
  const contasBancarias = await prisma.contaBancaria.findMany({
    where: { status: 'Ativo' },
    orderBy: { nomeConta: 'asc' }
  });

  const caixinhas = await prisma.caixinha.findMany({
    where: { status: 'Ativo' },
    include: {
      contaBancaria: true
    },
    orderBy: { nome: 'asc' }
  });

  return {
    contasBancarias,
    caixinhas
  };
}

export default async function ExtratoPage() {
  const data = await getExtratoData();

  return <ExtratoClient {...data} />;
}
