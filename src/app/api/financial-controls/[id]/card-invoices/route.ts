import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { cardInvoices, cards, financialControlUsers, monthlyTransactions } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: controlId } = await context.params;
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');

  if (!month) {
    return NextResponse.json({ error: 'Mês não informado' }, { status: 400 });
  }

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

    // Buscar faturas do mês com informações do cartão
    const invoices = await db
      .select({
        id: cardInvoices.id,
        cardId: cardInvoices.cardId,
        cardName: cards.name,
        totalAmount: cardInvoices.totalAmount,
        dueDate: cardInvoices.dueDate,
        isPaid: cardInvoices.isPaid,
        paidDate: cardInvoices.paidDate,
      })
      .from(cardInvoices)
      .leftJoin(cards, eq(cardInvoices.cardId, cards.id))
      .where(
        and(
          eq(cardInvoices.financialControlId, controlId),
          eq(cardInvoices.monthYear, month)
        )
      );

    // Contar transações por fatura
    const invoicesWithCount = await Promise.all(
      invoices.map(async (invoice) => {
        const [result] = await db
          .select({ count: count() })
          .from(monthlyTransactions)
          .where(eq(monthlyTransactions.cardInvoiceId, invoice.id));

        return {
          ...invoice,
          transactionCount: result.count,
        };
      })
    );

    return NextResponse.json(invoicesWithCount);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar faturas' }, { status: 500 });
  }
}
