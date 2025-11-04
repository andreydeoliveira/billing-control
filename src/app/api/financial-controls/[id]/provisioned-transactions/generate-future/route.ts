import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { provisionedTransactions, monthlyTransactions, financialControlUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrBefore);

// POST /api/financial-controls/[id]/provisioned-transactions/generate-future
// Gera transações futuras para provisionados recorrentes
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: controlId } = await context.params;

  try {
    // Verificar acesso
    const userAccess = await db
      .select()
      .from(financialControlUsers)
      .where(
        and(
          eq(financialControlUsers.financialControlId, controlId),
          eq(financialControlUsers.userId, session.user.id)
        )
      )
      .limit(1);

    if (userAccess.length === 0) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { upToYear } = body; // Ex: 2027

    if (!upToYear || upToYear < 2025) {
      return NextResponse.json(
        { error: 'Ano inválido. Informe o ano até o qual deseja gerar (ex: 2027)' },
        { status: 400 }
      );
    }

    // Buscar todos os provisionados recorrentes
    const recurrentProvisioned = await db
      .select()
      .from(provisionedTransactions)
      .where(
        and(
          eq(provisionedTransactions.financialControlId, controlId),
          eq(provisionedTransactions.isRecurring, true)
        )
      );

    if (recurrentProvisioned.length === 0) {
      return NextResponse.json(
        { message: 'Nenhum provisionado recorrente encontrado' },
        { status: 200 }
      );
    }

    let totalGenerated = 0;

    for (const provisioned of recurrentProvisioned) {
      if (!provisioned.startDate) continue;

      const recurrenceType = provisioned.recurrenceType || 'monthly';
      const startDate = dayjs(provisioned.startDate);
      const targetDate = dayjs(`${upToYear}-12-31`);

      // Buscar a última transação gerada para este provisionado
      const lastTransaction = await db
        .select()
        .from(monthlyTransactions)
        .where(eq(monthlyTransactions.provisionedTransactionId, provisioned.id))
        .orderBy(monthlyTransactions.monthYear)
        .limit(1);

      let nextDate: dayjs.Dayjs;

      if (lastTransaction.length > 0) {
        // Já existem transações - começar do próximo período
        const lastMonthYear = lastTransaction[0].monthYear;
        if (recurrenceType === 'monthly') {
          nextDate = dayjs(lastMonthYear + '-01').add(1, 'month');
        } else {
          nextDate = dayjs(lastMonthYear + '-01').add(1, 'year');
        }
      } else {
        // Primeira geração
        nextDate = startDate;
      }

      const monthlyTransactionsToInsert = [];

      // Gerar transações até o ano alvo
      while (nextDate.isSameOrBefore(targetDate, 'month')) {
        const monthYear = nextDate.format('YYYY-MM');

        // Verificar se já existe
        const existing = await db
          .select()
          .from(monthlyTransactions)
          .where(
            and(
              eq(monthlyTransactions.provisionedTransactionId, provisioned.id),
              eq(monthlyTransactions.monthYear, monthYear)
            )
          )
          .limit(1);

        if (existing.length === 0) {
          monthlyTransactionsToInsert.push({
            financialControlId: controlId,
            provisionedTransactionId: provisioned.id,
            accountId: provisioned.accountId,
            observation: provisioned.observation || null,
            expectedAmount: provisioned.expectedAmount,
            actualAmount: null,
            monthYear: monthYear,
            paidDate: null,
            paymentMethod: provisioned.cardId ? 'credit_card' : 'bank_account',
            bankAccountId: provisioned.bankAccountId || null,
            cardId: provisioned.cardId || null,
            installmentNumber: null,
            totalInstallments: null,
          });
        }

        // Próximo período
        if (recurrenceType === 'monthly') {
          nextDate = nextDate.add(1, 'month');
        } else {
          nextDate = nextDate.add(1, 'year');
        }
      }

      if (monthlyTransactionsToInsert.length > 0) {
        await db.insert(monthlyTransactions).values(monthlyTransactionsToInsert);
        totalGenerated += monthlyTransactionsToInsert.length;
      }
    }

    return NextResponse.json({
      success: true,
      generated: totalGenerated,
      message: `${totalGenerated} transações geradas com sucesso até ${upToYear}`,
    });
  } catch (error) {
    console.error('Erro ao gerar transações futuras:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar transações futuras' },
      { status: 500 }
    );
  }
}
