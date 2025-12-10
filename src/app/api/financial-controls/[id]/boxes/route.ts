import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { bankAccountBoxes, financialControlUsers, bankAccounts, monthlyTransactions, transfers, expenseIncomeAccounts } from '@/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';

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

    // Buscar todas as caixinhas do controle financeiro com informações da conta bancária
    const boxes = await db
      .select({
        id: bankAccountBoxes.id,
        name: bankAccountBoxes.name,
        isActive: bankAccountBoxes.isActive,
        bankAccountId: bankAccountBoxes.bankAccountId,
        bankAccountName: bankAccounts.name,
        bankName: bankAccounts.bankName,
        createdAt: bankAccountBoxes.createdAt,
      })
      .from(bankAccountBoxes)
      .leftJoin(bankAccounts, eq(bankAccountBoxes.bankAccountId, bankAccounts.id))
      .where(eq(bankAccountBoxes.financialControlId, controlId))
      .orderBy(bankAccounts.name, bankAccountBoxes.name);

    // Buscar TODAS as transações e transferências de uma vez (não em loop)
    const boxIds = boxes.map(b => `'${b.id}'`).join(',') || "'null'";
    
    const allIncomes = await db
      .select({ boxId: monthlyTransactions.boxId, actualAmount: monthlyTransactions.actualAmount })
      .from(monthlyTransactions)
      .leftJoin(expenseIncomeAccounts, eq(monthlyTransactions.accountId, expenseIncomeAccounts.id))
      .where(
        and(
          sql`${monthlyTransactions.boxId} IN (${sql.raw(boxIds)})`,
          sql`${monthlyTransactions.paidDate} IS NOT NULL`,
          eq(expenseIncomeAccounts.type, 'income')
        )
      );

    const allExpenses = await db
      .select({ boxId: monthlyTransactions.boxId, actualAmount: monthlyTransactions.actualAmount })
      .from(monthlyTransactions)
      .leftJoin(expenseIncomeAccounts, eq(monthlyTransactions.accountId, expenseIncomeAccounts.id))
      .where(
        and(
          sql`${monthlyTransactions.boxId} IN (${sql.raw(boxIds)})`,
          sql`${monthlyTransactions.paidDate} IS NOT NULL`,
          eq(expenseIncomeAccounts.type, 'expense')
        )
      );

    const allTransfersIn = await db
      .select({ toBoxId: transfers.toBoxId, amount: transfers.amount })
      .from(transfers)
      .where(sql`${transfers.toBoxId} IN (${sql.raw(boxIds)})`);

    const allTransfersOut = await db
      .select({ fromBoxId: transfers.fromBoxId, amount: transfers.amount })
      .from(transfers)
      .where(sql`${transfers.fromBoxId} IN (${sql.raw(boxIds)})`);

    // Calcular saldo usando dados em memória
    const boxesWithBalance = boxes.map((box) => {
      const totalIncome = allIncomes
        .filter(t => t.boxId === box.id)
        .reduce((sum, t) => sum + parseFloat(t.actualAmount || '0'), 0);
      const totalExpense = allExpenses
        .filter(t => t.boxId === box.id)
        .reduce((sum, t) => sum + parseFloat(t.actualAmount || '0'), 0);
      const totalTransfersIn = allTransfersIn
        .filter(t => t.toBoxId === box.id)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const totalTransfersOut = allTransfersOut
        .filter(t => t.fromBoxId === box.id)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const currentBalance = totalIncome - totalExpense + totalTransfersIn - totalTransfersOut;

      return {
        ...box,
        currentBalance: currentBalance.toFixed(2),
      };
    });

    return NextResponse.json(boxesWithBalance);
  } catch (error) {
    console.error('Erro ao buscar caixinhas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar caixinhas' },
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

    // Verificar se a conta bancária pertence ao controle
    const account = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.id, body.bankAccountId),
          eq(bankAccounts.financialControlId, controlId)
        )
      )
      .limit(1);

    if (account.length === 0) {
      return NextResponse.json({ error: 'Conta bancária não encontrada' }, { status: 404 });
    }

    // Criar caixinha
    const [box] = await db
      .insert(bankAccountBoxes)
      .values({
        financialControlId: controlId,
        bankAccountId: body.bankAccountId,
        name: body.name,
      })
      .returning();

    return NextResponse.json(box, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar caixinha:', error);
    return NextResponse.json(
      { error: 'Erro ao criar caixinha' },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    // Verificar se a caixinha pertence ao controle
    const existingBox = await db
      .select()
      .from(bankAccountBoxes)
      .where(
        and(
          eq(bankAccountBoxes.id, body.id),
          eq(bankAccountBoxes.financialControlId, controlId)
        )
      )
      .limit(1);

    if (existingBox.length === 0) {
      return NextResponse.json({ error: 'Caixinha não encontrada' }, { status: 404 });
    }

    // Atualizar caixinha
    const [box] = await db
      .update(bankAccountBoxes)
      .set({
        name: body.name,
        updatedAt: new Date(),
      })
      .where(eq(bankAccountBoxes.id, body.id))
      .returning();

    return NextResponse.json(box);
  } catch (error) {
    console.error('Erro ao atualizar caixinha:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar caixinha' },
      { status: 500 }
    );
  }
}
