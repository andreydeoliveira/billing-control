import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { 
  bankAccounts, 
  financialControlUsers, 
  monthlyTransactions, 
  transfers,
  cardInvoices,
  expenseIncomeAccounts
} from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

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
    const month = searchParams.get('month'); // formato: YYYY-MM

    if (!month) {
      return NextResponse.json({ error: 'Mês não fornecido' }, { status: 400 });
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

    // Buscar contas do controle
    const accounts = await db
      .select({
        id: bankAccounts.id,
        initialBalance: bankAccounts.initialBalance,
      })
      .from(bankAccounts)
      .where(eq(bankAccounts.financialControlId, controlId));

    const results: Array<{ accountId: string; finalBalance: number }> = [];

    for (const acc of accounts) {
      const initial = parseFloat((acc.initialBalance as unknown as string) || '0');

      // Transações pagas do mês na conta bancária
      const txs = await db
        .select({ amount: monthlyTransactions.actualAmount, type: expenseIncomeAccounts.type })
        .from(monthlyTransactions)
        .leftJoin(expenseIncomeAccounts, eq(monthlyTransactions.accountId, expenseIncomeAccounts.id))
        .where(
          and(
            eq(monthlyTransactions.financialControlId, controlId),
            eq(monthlyTransactions.bankAccountId, acc.id),
            eq(monthlyTransactions.monthYear, month),
            sql`${monthlyTransactions.paidDate} IS NOT NULL`
          )
        );

      const incomeSum = txs
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);
      const expenseSum = txs
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount || '0'), 0);

      // Transferências do mês entre contas (ignorar movimentos internos de caixinha na mesma conta)
      const transfersIn = await db
        .select({ amount: transfers.amount, fromId: transfers.fromBankAccountId })
        .from(transfers)
        .where(and(eq(transfers.financialControlId, controlId), eq(transfers.monthYear, month), eq(transfers.toBankAccountId, acc.id)));
      const transfersOut = await db
        .select({ amount: transfers.amount, toId: transfers.toBankAccountId })
        .from(transfers)
        .where(and(eq(transfers.financialControlId, controlId), eq(transfers.monthYear, month), eq(transfers.fromBankAccountId, acc.id)));

      const transferInSum = transfersIn
        .filter((t) => t.fromId !== acc.id)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const transferOutSum = transfersOut
        .filter((t) => t.toId !== acc.id)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

      const finalBalance = initial + incomeSum - expenseSum + transferInSum - transferOutSum;
      results.push({ accountId: acc.id as unknown as string, finalBalance });
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('Erro ao buscar saldos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar saldos das contas' },
      { status: 500 }
    );
  }
}
