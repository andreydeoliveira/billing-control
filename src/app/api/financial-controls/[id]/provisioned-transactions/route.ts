import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { provisionedTransactions, financialControlUsers, bankAccounts, cards, expenseIncomeAccounts, monthlyTransactions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import dayjs from 'dayjs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: controlId } = await params;

    // Verificar se o usuário tem acesso ao controle
    const userAccess = await db
      .select()
      .from(financialControlUsers)
      .where(
        and(
          eq(financialControlUsers.userId, session.user.id),
          eq(financialControlUsers.financialControlId, controlId)
        )
      )
      .limit(1);

    if (userAccess.length === 0) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar provisionados com informações da conta/cartão e conta de categoria
    const provisioned = await db
      .select({
        id: provisionedTransactions.id,
        accountId: provisionedTransactions.accountId,
        accountName: expenseIncomeAccounts.name,
        observation: provisionedTransactions.observation,
        expectedAmount: provisionedTransactions.expectedAmount,
        bankAccountId: provisionedTransactions.bankAccountId,
        cardId: provisionedTransactions.cardId,
        isRecurring: provisionedTransactions.isRecurring,
        installments: provisionedTransactions.installments,
        currentInstallment: provisionedTransactions.currentInstallment,
        startDate: provisionedTransactions.startDate,
        createdAt: provisionedTransactions.createdAt,
        bankAccountName: bankAccounts.name,
        cardName: cards.name,
      })
      .from(provisionedTransactions)
      .leftJoin(expenseIncomeAccounts, eq(provisionedTransactions.accountId, expenseIncomeAccounts.id))
      .leftJoin(bankAccounts, eq(provisionedTransactions.bankAccountId, bankAccounts.id))
      .leftJoin(cards, eq(provisionedTransactions.cardId, cards.id))
      .where(eq(provisionedTransactions.financialControlId, controlId))
      .orderBy(provisionedTransactions.createdAt);

    return NextResponse.json(provisioned);
  } catch (error) {
    console.error('Erro ao buscar provisionados:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar provisionados' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: controlId } = await params;
    const body = await request.json();

    // Verificar se o usuário tem acesso ao controle
    const userAccess = await db
      .select()
      .from(financialControlUsers)
      .where(
        and(
          eq(financialControlUsers.userId, session.user.id),
          eq(financialControlUsers.financialControlId, controlId)
        )
      )
      .limit(1);

    if (userAccess.length === 0) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Validar que tem conta OU cartão (não ambos, não nenhum)
    if (!body.bankAccountId && !body.cardId) {
      return NextResponse.json(
        { error: 'Informe uma conta bancária ou cartão' },
        { status: 400 }
      );
    }

    if (!body.accountId) {
      return NextResponse.json(
        { error: 'Selecione uma conta (ex: Luz, Água, Uber)' },
        { status: 400 }
      );
    }

    // Criar provisionado
    const [provisioned] = await db
      .insert(provisionedTransactions)
      .values({
        financialControlId: controlId,
        accountId: body.accountId, // Vincular à conta (Luz, Água, Uber, etc)
        observation: body.observation || null,
        expectedAmount: body.expectedAmount,
        bankAccountId: body.bankAccountId || null,
        cardId: body.cardId || null,
        isRecurring: body.isRecurring,
        recurrenceType: body.recurrenceType || 'monthly', // 'monthly' ou 'yearly'
        installments: body.installments,
        currentInstallment: 1,
        startDate: body.startDate || null,
      })
      .returning();

    // Gerar automaticamente as transações mensais
    if (body.isRecurring && body.startDate) {
      // Recorrente: gerar conforme o tipo (mensal ou anual)
      const monthlyTransactionsToInsert = [];
      const startDate = dayjs(body.startDate);
      const recurrenceType = body.recurrenceType || 'monthly';
      
      if (recurrenceType === 'monthly') {
        // Mensal: gerar 12 meses
        for (let i = 0; i < 12; i++) {
          const monthDate = startDate.add(i, 'month');
          const monthYear = monthDate.format('YYYY-MM');
          
          monthlyTransactionsToInsert.push({
            financialControlId: controlId,
            provisionedTransactionId: provisioned.id,
            accountId: body.accountId,
            observation: body.observation || null,
            expectedAmount: body.expectedAmount,
            actualAmount: null,
            monthYear: monthYear,
            paidDate: null,
            paymentMethod: body.cardId ? 'credit_card' : 'bank_account',
            bankAccountId: body.bankAccountId || null,
            cardId: body.cardId || null,
            installmentNumber: null, // Recorrente não tem parcela
            totalInstallments: null,
          });
        }
      } else if (recurrenceType === 'yearly') {
        // Anual: gerar para os próximos 3 anos (mesmo mês de cada ano)
        for (let i = 0; i < 3; i++) {
          const yearDate = startDate.add(i, 'year');
          const monthYear = yearDate.format('YYYY-MM');
          
          monthlyTransactionsToInsert.push({
            financialControlId: controlId,
            provisionedTransactionId: provisioned.id,
            accountId: body.accountId,
            observation: body.observation || null,
            expectedAmount: body.expectedAmount,
            actualAmount: null,
            monthYear: monthYear,
            paidDate: null,
            paymentMethod: body.cardId ? 'credit_card' : 'bank_account',
            bankAccountId: body.bankAccountId || null,
            cardId: body.cardId || null,
            installmentNumber: null,
            totalInstallments: null,
          });
        }
      }
      
      await db.insert(monthlyTransactions).values(monthlyTransactionsToInsert);
    } else if (body.installments && body.installments > 0 && body.startDate) {
      // Parcelado: gerar conforme as parcelas
      const monthlyTransactionsToInsert = [];
      
      for (let i = 0; i < body.installments; i++) {
        const monthDate = dayjs(body.startDate).add(i, 'month');
        const monthYear = monthDate.format('YYYY-MM');
        
        monthlyTransactionsToInsert.push({
          financialControlId: controlId,
          provisionedTransactionId: provisioned.id,
          accountId: body.accountId,
          observation: body.observation || null,
          expectedAmount: body.expectedAmount,
          actualAmount: null,
          monthYear: monthYear,
          paidDate: null,
          paymentMethod: body.cardId ? 'credit_card' : 'bank_account',
          bankAccountId: body.bankAccountId || null,
          cardId: body.cardId || null,
          installmentNumber: i + 1,
          totalInstallments: body.installments,
        });
      }
      
      await db.insert(monthlyTransactions).values(monthlyTransactionsToInsert);
    }

    return NextResponse.json(provisioned, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar provisionado:', error);
    return NextResponse.json(
      { error: 'Erro ao criar provisionado' },
      { status: 500 }
    );
  }
}
