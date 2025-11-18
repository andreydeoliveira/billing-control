import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { provisionedTransactions, financialControlUsers, monthlyTransactions } from '@/db/schema';
import { eq, and, isNull, gte, lte, sql } from 'drizzle-orm';
import {
  parseAmount,
  validateInstallments,
} from '@/lib/validation';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; provisionedId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: controlId, provisionedId } = await context.params;
  const { searchParams } = new URL(request.url);
  const strategy = searchParams.get('strategy');

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

    // Se strategy = 'check', retornar informações sobre as transações vinculadas
    if (strategy === 'check') {
      const relatedTransactions = await db
        .select({
          id: monthlyTransactions.id,
          monthYear: monthlyTransactions.monthYear,
          isPaid: sql<boolean>`${monthlyTransactions.paidDate} IS NOT NULL`,
          actualAmount: monthlyTransactions.actualAmount,
          expectedAmount: monthlyTransactions.expectedAmount,
        })
        .from(monthlyTransactions)
        .where(
          and(
            eq(monthlyTransactions.provisionedTransactionId, provisionedId),
            eq(monthlyTransactions.financialControlId, controlId)
          )
        )
        .orderBy(monthlyTransactions.monthYear);

      const totalTransactions = relatedTransactions.length;
      const paidTransactions = relatedTransactions.filter(t => t.isPaid).length;
      const unpaidTransactions = totalTransactions - paidTransactions;

      return NextResponse.json({
        hasRelatedTransactions: totalTransactions > 0,
        totalTransactions,
        paidTransactions,
        unpaidTransactions,
        transactions: relatedTransactions,
      });
    }

    return NextResponse.json({ error: 'Strategy não especificada' }, { status: 400 });
  } catch (error) {
    console.error('Erro ao verificar transações:', error);
    return NextResponse.json({ error: 'Erro ao verificar transações' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; provisionedId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: controlId, provisionedId } = await context.params;

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
    if (!body.accountId) {
      return NextResponse.json(
        { error: 'Selecione uma conta (ex: Luz, Água, Uber)' },
        { status: 400 }
      );
    }

    const validatedAmount = parseAmount(body.expectedAmount).toString();
    const validatedInstallments = validateInstallments(body.installments);

    // Forma de pagamento é opcional (pode ser "conta a pagar")
    // Garantir que quando muda a fonte de pagamento, o campo anterior seja limpo
    const bankAccountId = body.bankAccountId && body.bankAccountId !== '' ? body.bankAccountId : null;
    const cardId = body.cardId && body.cardId !== '' ? body.cardId : null;

    // Atualizar provisionado
    await db
      .update(provisionedTransactions)
      .set({
        accountId: body.accountId,
        observation: body.observation || null,
        expectedAmount: validatedAmount,
        bankAccountId,
        cardId,
        isRecurring: body.isRecurring,
        installments: validatedInstallments,
        startDate: body.startDate || null,
        endDate: body.endDate || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(provisionedTransactions.id, provisionedId),
          eq(provisionedTransactions.financialControlId, controlId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    // Log estruturado
    console.error('[SECURITY] Error updating provisioned transaction:', {
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      controlId,
      provisionedId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Retornar erro específico se for de validação
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Erro ao atualizar provisionado' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; provisionedId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: controlId, provisionedId } = await context.params;
  const { searchParams } = new URL(request.url);
  const strategy = searchParams.get('strategy'); // 'all' | 'unpaid' | 'period'
  const startMonth = searchParams.get('startMonth'); // formato: YYYY-MM
  const endMonth = searchParams.get('endMonth'); // formato: YYYY-MM

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

    // Estratégia de exclusão
    if (strategy === 'all') {
      // Deletar TODAS as transações mensais vinculadas
      await db
        .delete(monthlyTransactions)
        .where(
          and(
            eq(monthlyTransactions.provisionedTransactionId, provisionedId),
            eq(monthlyTransactions.financialControlId, controlId)
          )
        );
    } else if (strategy === 'unpaid') {
      // Deletar apenas transações NÃO pagas
      await db
        .delete(monthlyTransactions)
        .where(
          and(
            eq(monthlyTransactions.provisionedTransactionId, provisionedId),
            eq(monthlyTransactions.financialControlId, controlId),
            isNull(monthlyTransactions.paidDate)
          )
        );
    } else if (strategy === 'period' && startMonth && endMonth) {
      // Deletar transações dentro de um período
      await db
        .delete(monthlyTransactions)
        .where(
          and(
            eq(monthlyTransactions.provisionedTransactionId, provisionedId),
            eq(monthlyTransactions.financialControlId, controlId),
            gte(monthlyTransactions.monthYear, startMonth),
            lte(monthlyTransactions.monthYear, endMonth)
          )
        );
    } else if (!strategy) {
      // Se não tem estratégia, deletar todas as transações vinculadas
      // (para casos sem transações ou exclusão simples)
      await db
        .delete(monthlyTransactions)
        .where(
          and(
            eq(monthlyTransactions.provisionedTransactionId, provisionedId),
            eq(monthlyTransactions.financialControlId, controlId)
          )
        );
    }

    // Deletar o provisionado
    await db
      .delete(provisionedTransactions)
      .where(
        and(
          eq(provisionedTransactions.id, provisionedId),
          eq(provisionedTransactions.financialControlId, controlId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao deletar provisionado:', error);
    return NextResponse.json({ error: 'Erro ao deletar provisionado' }, { status: 500 });
  }
}
