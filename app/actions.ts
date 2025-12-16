'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { hashPassword } from '@/lib/auth';

export async function getUsers() {
  return await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      updatedAt: true,
      // Nunca retornar passwordHash por segurança
    }
  });
}

/**
 * Função de exemplo para criar usuário
 * IMPORTANTE: Para cadastro real, use /auth/signup
 * Esta função não valida email, não faz rate limiting, etc.
 */
export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  
  if (!password || !email) {
    throw new Error('Email e senha são obrigatórios');
  }
  
  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: { 
      name: name || null, 
      email: email.trim().toLowerCase(), 
      passwordHash 
    }
  });

  revalidatePath('/');
}

export async function getDashboardData() {
  try {
    const now = new Date();
    const mesAtual = now.getMonth() + 1;
    const anoAtual = now.getFullYear();

    // Buscar transações pendentes do mês atual
    const transacoesPendentes = await prisma.transacao.findMany({
      where: {
        mes: mesAtual,
        ano: anoAtual,
        status: 'pendente',
        tipo: 'despesa',
      },
      include: {
        conta: {
          include: {
            categoria: true,
          },
        },
      },
      orderBy: {
        data: 'asc',
      },
    });

    // Buscar todas as transações do mês (para cálculo de percentual)
    const todasTransacoesMes = await prisma.transacao.findMany({
      where: {
        mes: mesAtual,
        ano: anoAtual,
        tipo: 'despesa',
      },
      include: {
        conta: {
          include: {
            categoria: true,
          },
        },
      },
    });

    // Agrupar por categoria
    const despesasPorCategoria = todasTransacoesMes.reduce((acc, transacao) => {
      if (!transacao.conta) return acc;
      
      const categoriaNome = transacao.conta.categoria.nome;
      
      if (!acc[categoriaNome]) {
        acc[categoriaNome] = {
          categoria: categoriaNome,
          total: 0,
          pendente: 0,
          pago: 0,
        };
      }
      
      acc[categoriaNome].total += transacao.valor;
      
      if (transacao.status === 'pendente') {
        acc[categoriaNome].pendente += transacao.valor;
      } else {
        acc[categoriaNome].pago += transacao.valor;
      }
      
      return acc;
    }, {} as Record<string, { categoria: string; total: number; pendente: number; pago: number }>);

    const despesasArray = Object.values(despesasPorCategoria);
    const totalGeral = despesasArray.reduce((sum, item) => sum + item.total, 0);

    // Calcular percentuais
    const despesasComPercentual = despesasArray.map(item => ({
      ...item,
      percentual: totalGeral > 0 ? (item.total / totalGeral) * 100 : 0,
    }));

    // Ordenar por valor total (maior primeiro)
    despesasComPercentual.sort((a, b) => b.total - a.total);

    // Serializar as transações pendentes
    const transacoesSerializadas = transacoesPendentes.map(t => ({
      id: t.id,
      descricao: t.descricao,
      valor: t.valor,
      data: t.data.toISOString(),
      conta: t.conta ? {
        nome: t.conta.nome,
        categoria: {
          nome: t.conta.categoria.nome,
        },
      } : null,
    }));

    return {
      transacoesPendentes: transacoesSerializadas,
      despesasPorCategoria: despesasComPercentual,
      totalGeral,
      totalPendente: despesasComPercentual.reduce((sum, item) => sum + item.pendente, 0),
      totalPago: despesasComPercentual.reduce((sum, item) => sum + item.pago, 0),
    };
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    throw new Error('Erro ao carregar dados do dashboard');
  }
}
