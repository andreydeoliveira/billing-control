import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { monthlyTransactions, financialControlUsers, expenseIncomeAccounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; invoiceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: controlId, invoiceId } = await context.params;

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

    // Buscar transações da fatura
    const transactions = await db
      .select({
        id: monthlyTransactions.id,
        name: expenseIncomeAccounts.name,
        type: expenseIncomeAccounts.type,
        expectedAmount: monthlyTransactions.expectedAmount,
        actualAmount: monthlyTransactions.actualAmount,
        paidDate: monthlyTransactions.paidDate,
        installmentNumber: monthlyTransactions.installmentNumber,
        totalInstallments: monthlyTransactions.totalInstallments,
      })
      .from(monthlyTransactions)
      .leftJoin(expenseIncomeAccounts, eq(monthlyTransactions.accountId, expenseIncomeAccounts.id))
      .where(
        and(
          eq(monthlyTransactions.cardInvoiceId, invoiceId),
          eq(monthlyTransactions.financialControlId, controlId)
        )
      );

    return NextResponse.json(transactions);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar transações da fatura' }, { status: 500 });
  }
}
