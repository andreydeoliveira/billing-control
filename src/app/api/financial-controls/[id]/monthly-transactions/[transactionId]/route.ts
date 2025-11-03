import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { monthlyTransactions, financialControlUsers, cardInvoices } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { parseAmount, validateDate } from '@/lib/validation';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; transactionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: controlId, transactionId } = await context.params;

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

    // Validações de entrada
    let validatedExpectedAmount: string | undefined;
    let validatedActualAmount: string | null | undefined;
    
    if (body.expectedAmount) {
      const amount = parseAmount(body.expectedAmount);
      validatedExpectedAmount = amount.toString();
    }
    
    if (body.actualAmount !== undefined) {
      if (body.actualAmount === null || body.actualAmount === '') {
        validatedActualAmount = null;
      } else {
        const amount = parseAmount(body.actualAmount);
        validatedActualAmount = amount.toString();
      }
    }

    const validatedPaidDate = body.paidDate !== undefined 
      ? validateDate(body.paidDate) 
      : undefined;

    // Buscar transação atual para verificar mudanças no valor
    const [currentTransaction] = await db
      .select()
      .from(monthlyTransactions)
      .where(
        and(
          eq(monthlyTransactions.id, transactionId),
          eq(monthlyTransactions.financialControlId, controlId)
        )
      )
      .limit(1);

    if (!currentTransaction) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }

    const oldValue = parseAmount(currentTransaction.expectedAmount);
    const newValue = validatedExpectedAmount ? parseAmount(validatedExpectedAmount) : oldValue;
    const valueDiff = newValue - oldValue;

    // Atualizar transação com valores validados
    const [updatedTransaction] = await db
      .update(monthlyTransactions)
      .set({
        observation: body.observation !== undefined ? body.observation : currentTransaction.observation,
        expectedAmount: validatedExpectedAmount || currentTransaction.expectedAmount,
        actualAmount: validatedActualAmount !== undefined ? validatedActualAmount : currentTransaction.actualAmount,
        paidDate: validatedPaidDate !== undefined ? validatedPaidDate : currentTransaction.paidDate,
      })
      .where(
        and(
          eq(monthlyTransactions.id, transactionId),
          eq(monthlyTransactions.financialControlId, controlId)
        )
      )
      .returning();

    // Se for cartão e o valor mudou, atualizar fatura
    if (currentTransaction.cardInvoiceId && valueDiff !== 0) {
      const [invoice] = await db
        .select()
        .from(cardInvoices)
        .where(eq(cardInvoices.id, currentTransaction.cardInvoiceId))
        .limit(1);

      if (invoice) {
        const newTotal = parseFloat(invoice.totalAmount) + valueDiff;
        await db
          .update(cardInvoices)
          .set({ totalAmount: String(newTotal) })
          .where(eq(cardInvoices.id, currentTransaction.cardInvoiceId));
      }
    }

    return NextResponse.json(updatedTransaction);
  } catch (error) {
    // Log estruturado de erro
    console.error('[SECURITY] Error updating transaction:', {
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      controlId,
      transactionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Retornar erro específico se for de validação
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Erro ao atualizar transação' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; transactionId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: controlId, transactionId } = await context.params;

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

    // Buscar transação para atualizar fatura se necessário
    const [transaction] = await db
      .select()
      .from(monthlyTransactions)
      .where(
        and(
          eq(monthlyTransactions.id, transactionId),
          eq(monthlyTransactions.financialControlId, controlId)
        )
      )
      .limit(1);

    if (!transaction) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }

    // Se tiver fatura vinculada, atualizar o total
    if (transaction.cardInvoiceId) {
      const [invoice] = await db
        .select()
        .from(cardInvoices)
        .where(eq(cardInvoices.id, transaction.cardInvoiceId))
        .limit(1);

      if (invoice) {
        const newTotal = parseFloat(invoice.totalAmount) - parseFloat(transaction.expectedAmount);
        await db
          .update(cardInvoices)
          .set({ totalAmount: String(Math.max(0, newTotal)) })
          .where(eq(cardInvoices.id, transaction.cardInvoiceId));
      }
    }

    // Deletar transação
    await db
      .delete(monthlyTransactions)
      .where(
        and(
          eq(monthlyTransactions.id, transactionId),
          eq(monthlyTransactions.financialControlId, controlId)
        )
      );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao deletar transação' }, { status: 500 });
  }
}
