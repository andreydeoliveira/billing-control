import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { monthlyTransactions, financialControlUsers, bankAccounts, cards, cardInvoices, expenseIncomeAccounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

    // Buscar transações mensais com JOIN para nomes de conta/cartão
    const transactions = await db
      .select({
        id: monthlyTransactions.id,
        name: expenseIncomeAccounts.name,
        type: expenseIncomeAccounts.type,
        expectedAmount: monthlyTransactions.expectedAmount,
        actualAmount: monthlyTransactions.actualAmount,
        paidDate: monthlyTransactions.paidDate,
        paymentMethod: monthlyTransactions.paymentMethod,
        bankAccountId: monthlyTransactions.bankAccountId,
        cardId: monthlyTransactions.cardId,
        provisionedTransactionId: monthlyTransactions.provisionedTransactionId,
        bankAccountName: bankAccounts.name,
        cardName: cards.name,
      })
      .from(monthlyTransactions)
      .leftJoin(expenseIncomeAccounts, eq(monthlyTransactions.accountId, expenseIncomeAccounts.id))
      .leftJoin(bankAccounts, eq(monthlyTransactions.bankAccountId, bankAccounts.id))
      .leftJoin(cards, eq(monthlyTransactions.cardId, cards.id))
      .where(
        and(
          eq(monthlyTransactions.financialControlId, controlId),
          eq(monthlyTransactions.monthYear, month)
        )
      );

    // Adicionar flag de provisionado e se está pago
    const enrichedTransactions = transactions.map((t) => ({
      ...t,
      isPaid: !!t.paidDate,
      isProvisioned: !!t.provisionedTransactionId,
    }));

    return NextResponse.json(enrichedTransactions);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar transações' }, { status: 500 });
  }
}

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

    // Garantir que sempre tratamos JSON e não quebramos em erro
    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Payload inválido. Envie JSON.' }, { status: 400 });
    }

    // Validações
    if (!body.accountId) {
      return NextResponse.json({ error: 'Selecione uma conta (ex: Luz, Água, Uber)' }, { status: 400 });
    }

    if (!body.expectedAmount || !body.paymentMethod || !body.monthYear) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    if (body.paymentMethod === 'bank_account' && !body.bankAccountId) {
      return NextResponse.json({ error: 'Selecione uma conta bancária' }, { status: 400 });
    }

    if (body.paymentMethod === 'credit_card' && !body.cardId) {
      return NextResponse.json({ error: 'Selecione um cartão' }, { status: 400 });
    }

    // Criar transação (sem geração automática de transferência de caixinha)

    const [newTransaction] = await db
      .insert(monthlyTransactions)
      .values({
        financialControlId: controlId,
        accountId: body.accountId, // Vincular à conta (Luz, Água, Uber, etc)
        observation: body.observation || null,
        expectedAmount: body.expectedAmount,
        actualAmount: body.actualAmount || null,
        monthYear: body.monthYear,
        paidDate: body.paidDate || null,
        paymentMethod: body.paymentMethod,
        bankAccountId: body.bankAccountId || null,
        cardId: body.cardId || null,
        boxId: body.boxId || null,
      })
      .returning();

    // Se for cartão de crédito e estiver pago, atualizar/criar fatura
    if (body.paymentMethod === 'credit_card' && body.cardId) {
      // Buscar ou criar fatura do mês
      const existingInvoice = await db
        .select()
        .from(cardInvoices)
        .where(
          and(
            eq(cardInvoices.financialControlId, controlId),
            eq(cardInvoices.cardId, body.cardId),
            eq(cardInvoices.monthYear, body.monthYear)
          )
        )
        .limit(1);

      if (existingInvoice.length > 0) {
        // Atualizar total da fatura
        const currentTotal = parseFloat(existingInvoice[0].totalAmount);
        const transactionValue = parseFloat(body.expectedAmount);
        
        await db
          .update(cardInvoices)
          .set({
            totalAmount: String(currentTotal + transactionValue),
          })
          .where(eq(cardInvoices.id, existingInvoice[0].id));

        // Vincular transação à fatura
        await db
          .update(monthlyTransactions)
          .set({ cardInvoiceId: existingInvoice[0].id })
          .where(eq(monthlyTransactions.id, newTransaction.id));
      } else {
        // Criar nova fatura
        const [newInvoice] = await db
          .insert(cardInvoices)
          .values({
            financialControlId: controlId,
            cardId: body.cardId,
            monthYear: body.monthYear,
            totalAmount: body.expectedAmount,
            isPaid: false,
          })
          .returning();

        // Vincular transação à fatura
        await db
          .update(monthlyTransactions)
          .set({ cardInvoiceId: newInvoice.id })
          .where(eq(monthlyTransactions.id, newTransaction.id));
      }
    }

    return NextResponse.json(newTransaction, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao criar transação' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: controlId } = await context.params;

  try {
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

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Payload inválido. Envie JSON.' }, { status: 400 });
    }

    if (!body.id) {
      return NextResponse.json({ error: 'ID da transação é obrigatório' }, { status: 400 });
    }

    // Garantir que a transação pertence ao controle
    const existing = await db
      .select()
      .from(monthlyTransactions)
      .where(and(eq(monthlyTransactions.id, body.id), eq(monthlyTransactions.financialControlId, controlId)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }

    const update: any = {};
    if (body.paidDate !== undefined) update.paidDate = body.paidDate; // string yyyy-mm-dd
    if (body.actualAmount !== undefined) update.actualAmount = body.actualAmount;
    if (body.bankAccountId !== undefined) update.bankAccountId = body.bankAccountId || null;
    if (body.cardId !== undefined) update.cardId = body.cardId || null;
    if (body.boxId !== undefined) update.boxId = body.boxId || null;
    if (body.monthYear !== undefined) update.monthYear = body.monthYear;
    if (body.observation !== undefined) update.observation = body.observation || null;

    const [updated] = await db
      .update(monthlyTransactions)
      .set(update)
      .where(eq(monthlyTransactions.id, body.id))
      .returning();

    return NextResponse.json({ message: 'Transação atualizada', transaction: updated });
  } catch (error) {
    console.error('Erro ao atualizar transação mensal:', error);
    return NextResponse.json({ error: 'Erro ao atualizar transação' }, { status: 500 });
  }
}
