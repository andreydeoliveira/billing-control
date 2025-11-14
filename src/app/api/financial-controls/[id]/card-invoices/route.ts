import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { cardInvoices, cards, financialControlUsers, monthlyTransactions } from '@/db/schema';
import { eq, and, count, sum, isNull, isNotNull, sql } from 'drizzle-orm';

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

    // Primeiro, verificar se existem transações de cartão sem fatura
    const orphanTransactions = await db
      .select({
        cardId: monthlyTransactions.cardId,
        totalAmount: sum(monthlyTransactions.expectedAmount),
      })
      .from(monthlyTransactions)
      .where(
        and(
          eq(monthlyTransactions.financialControlId, controlId),
          eq(monthlyTransactions.monthYear, month),
          eq(monthlyTransactions.paymentMethod, 'credit_card'),
          isNull(monthlyTransactions.cardInvoiceId)
        )
      )
      .groupBy(monthlyTransactions.cardId);

    console.log('=== CARD INVOICES DEBUG ===');
    console.log('Month:', month);
    console.log('Orphan transactions:', orphanTransactions);

    // Criar faturas para transações órfãs
    for (const orphan of orphanTransactions) {
      if (!orphan.cardId) continue;

      console.log('Processing orphan for card:', orphan.cardId, 'Total:', orphan.totalAmount);

      // Verificar se já existe fatura para este cartão neste mês
      const existingInvoice = await db
        .select()
        .from(cardInvoices)
        .where(
          and(
            eq(cardInvoices.financialControlId, controlId),
            eq(cardInvoices.cardId, orphan.cardId),
            eq(cardInvoices.monthYear, month)
          )
        )
        .limit(1);

      if (existingInvoice.length === 0) {
        console.log('Creating new invoice for card:', orphan.cardId);
        
        // Buscar informações do cartão para pegar o dueDay
        const [cardData] = await db
          .select()
          .from(cards)
          .where(eq(cards.id, orphan.cardId))
          .limit(1);

        // Calcular data de vencimento
        let dueDate = null;
        if (cardData?.dueDay) {
          const [year, monthNum] = month.split('-');
          dueDate = `${year}-${monthNum}-${cardData.dueDay.padStart(2, '0')}`;
        }

        // Criar nova fatura
        const [newInvoice] = await db
          .insert(cardInvoices)
          .values({
            financialControlId: controlId,
            cardId: orphan.cardId,
            monthYear: month,
            totalAmount: orphan.totalAmount || '0',
            dueDate: dueDate,
            isPaid: false,
          })
          .returning();

        console.log('Created invoice:', newInvoice.id);

        // Vincular todas as transações órfãs desta fatura
        const updateResult = await db
          .update(monthlyTransactions)
          .set({ cardInvoiceId: newInvoice.id })
          .where(
            and(
              eq(monthlyTransactions.financialControlId, controlId),
              eq(monthlyTransactions.monthYear, month),
              eq(monthlyTransactions.cardId, orphan.cardId),
              isNull(monthlyTransactions.cardInvoiceId)
            )
          )
          .returning();

        console.log('Linked transactions:', updateResult.length);
      } else {
        console.log('Invoice already exists for card:', orphan.cardId);
        
        // Fatura existe, mas transações estão órfãs - vincular
        const updateResult = await db
          .update(monthlyTransactions)
          .set({ cardInvoiceId: existingInvoice[0].id })
          .where(
            and(
              eq(monthlyTransactions.financialControlId, controlId),
              eq(monthlyTransactions.monthYear, month),
              eq(monthlyTransactions.cardId, orphan.cardId),
              isNull(monthlyTransactions.cardInvoiceId)
            )
          )
          .returning();

        console.log('Linked orphan transactions to existing invoice:', updateResult.length);

        // Atualizar total da fatura
        if (orphan.totalAmount && parseFloat(orphan.totalAmount) > 0) {
          const currentTotal = parseFloat(existingInvoice[0].totalAmount);
          await db
            .update(cardInvoices)
            .set({
              totalAmount: String(currentTotal + parseFloat(orphan.totalAmount)),
            })
            .where(eq(cardInvoices.id, existingInvoice[0].id));
        }
      }
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
        bankAccountId: cardInvoices.bankAccountId,
      })
      .from(cardInvoices)
      .leftJoin(cards, eq(cardInvoices.cardId, cards.id))
      .where(
        and(
          eq(cardInvoices.financialControlId, controlId),
          eq(cardInvoices.monthYear, month)
        )
      );

    // Contar transações e calcular totais por fatura
    const invoicesWithCount = await Promise.all(
      invoices.map(async (invoice) => {
        // Contar transações
        const [countResult] = await db
          .select({ count: count() })
          .from(monthlyTransactions)
          .where(eq(monthlyTransactions.cardInvoiceId, invoice.id));

        // Calcular total REAL (soma de actualAmount quando existe)
        const [actualResult] = await db
          .select({
            total: sum(monthlyTransactions.actualAmount),
          })
          .from(monthlyTransactions)
          .where(
            and(
              eq(monthlyTransactions.cardInvoiceId, invoice.id),
              isNotNull(monthlyTransactions.actualAmount),
              isNotNull(monthlyTransactions.paidDate)
            )
          );

        // Calcular total ESPERADO (soma de expectedAmount das provisionadas)
        const [expectedResult] = await db
          .select({
            total: sum(monthlyTransactions.expectedAmount),
          })
          .from(monthlyTransactions)
          .where(
            and(
              eq(monthlyTransactions.cardInvoiceId, invoice.id),
              isNotNull(monthlyTransactions.provisionedTransactionId)
            )
          );

        // Verificar se tem transações pendentes (com expectedAmount mas sem actualAmount)
        const [pendingResult] = await db
          .select({
            count: count(),
          })
          .from(monthlyTransactions)
          .where(
            and(
              eq(monthlyTransactions.cardInvoiceId, invoice.id),
              isNotNull(monthlyTransactions.provisionedTransactionId),
              isNull(monthlyTransactions.actualAmount)
            )
          );

        const actualTotal = actualResult.total ? parseFloat(actualResult.total) : 0;
        const expectedTotal = expectedResult.total ? parseFloat(expectedResult.total) : 0;
        const hasPendingTransactions = (pendingResult.count || 0) > 0;

        return {
          ...invoice,
          transactionCount: countResult.count,
          actualTotal: actualTotal.toFixed(2),
          expectedTotal: expectedTotal.toFixed(2),
          hasPendingTransactions,
        };
      })
    );

    return NextResponse.json(invoicesWithCount);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar faturas' }, { status: 500 });
  }
}
