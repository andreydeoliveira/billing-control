import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { monthlyTransactions, financialControlUsers, expenseIncomeAccounts as accounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!month) {
      return NextResponse.json({ error: 'Mês não informado' }, { status: 400 });
    }

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

    // Buscar transações do mês com categorias
    const transactionsList = await db
      .select({
        id: monthlyTransactions.id,
        name: accounts.name,
        type: accounts.type,
        expectedAmount: monthlyTransactions.expectedAmount,
        actualAmount: monthlyTransactions.actualAmount,
        paidDate: monthlyTransactions.paidDate,
        monthYear: monthlyTransactions.monthYear,
        accountId: monthlyTransactions.accountId,
        accountName: accounts.name,
        accountColor: accounts.color,
      })
      .from(monthlyTransactions)
      .leftJoin(accounts, eq(monthlyTransactions.accountId, accounts.id))
      .where(
        and(
          eq(monthlyTransactions.financialControlId, controlId),
          eq(monthlyTransactions.monthYear, month)
        )
      );

    return NextResponse.json({ transactions: transactionsList });
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
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
    const { name, type, expectedAmount, categoryId, monthYear } = body;

    if (!name || !type || !expectedAmount || !monthYear) {
      return NextResponse.json(
        { error: 'Nome, tipo, valor e mês são obrigatórios' },
        { status: 400 }
      );
    }

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

    // Criar transação
    const [newTransaction] = await db
      .insert(monthlyTransactions)
      .values({
        financialControlId: controlId,
        accountId: categoryId || '', // O nome e tipo virão da conta vinculada
        observation: null,
        expectedAmount: expectedAmount.toString(),
        monthYear,
        paymentMethod: 'cash', // Default, pode ser melhorado depois
      })
      .returning();

    return NextResponse.json({ transaction: newTransaction }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar transação:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
