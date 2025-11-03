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
import { eq, and, gte, lte, isNotNull, sql } from 'drizzle-orm';

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

    // Buscar contas com trackBalance = true
    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.financialControlId, controlId),
          eq(bankAccounts.trackBalance, true)
        )
      );

    if (accounts.length === 0) {
      return NextResponse.json([]);
    }

    const startDate = new Date(`${month}-01`);
    const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);

    const balances = await Promise.all(
      accounts.map(async (account) => {
        const accountId = account.id;
        
        // 1. Transações pagas na conta (receitas e despesas)
        const transactions = await db
          .select({
            type: expenseIncomeAccounts.type,
            actualAmount: monthlyTransactions.actualAmount,
          })
          .from(monthlyTransactions)
          .leftJoin(expenseIncomeAccounts, eq(monthlyTransactions.accountId, expenseIncomeAccounts.id))
          .where(
            and(
              eq(monthlyTransactions.bankAccountId, accountId),
              eq(monthlyTransactions.monthYear, month),
              sql`${monthlyTransactions.paidDate} IS NOT NULL`
            )
          );

        // 2. Transferências de saída (débito)
        const transfersOut = await db
          .select({
            amount: transfers.amount,
          })
          .from(transfers)
          .where(
            and(
              eq(transfers.fromBankAccountId, accountId),
              gte(transfers.transferDate, startDate.toISOString()),
              lte(transfers.transferDate, endDate.toISOString())
            )
          );

        // 3. Transferências de entrada (crédito)
        const transfersIn = await db
          .select({
            amount: transfers.amount,
          })
          .from(transfers)
          .where(
            and(
              eq(transfers.toBankAccountId, accountId),
              gte(transfers.transferDate, startDate.toISOString()),
              lte(transfers.transferDate, endDate.toISOString())
            )
          );

        // 4. Pagamentos de faturas (débito)
        const invoicePayments = await db
          .select({
            totalAmount: cardInvoices.totalAmount,
          })
          .from(cardInvoices)
          .where(
            and(
              eq(cardInvoices.bankAccountId, accountId),
              eq(cardInvoices.isPaid, true),
              sql`${cardInvoices.paidDate} >= ${startDate.toISOString()}`,
              sql`${cardInvoices.paidDate} <= ${endDate.toISOString()}`
            )
          );

        // Calcular saldo inicial
        const initialBalance = parseFloat(account.initialBalance || '0');

        // Calcular receitas e despesas
        const income = transactions
          .filter((t) => t.type === 'income')
          .reduce((sum, t) => sum + parseFloat(t.actualAmount || '0'), 0);

        const expenses = transactions
          .filter((t) => t.type === 'expense')
          .reduce((sum, t) => sum + parseFloat(t.actualAmount || '0'), 0);

        // Calcular transferências
        const transfersInTotal = transfersIn.reduce(
          (sum, t) => sum + parseFloat(t.amount), 
          0
        );

        const transfersOutTotal = transfersOut.reduce(
          (sum, t) => sum + parseFloat(t.amount), 
          0
        );

        // Calcular pagamentos de faturas
        const invoicePaymentsTotal = invoicePayments.reduce(
          (sum, i) => sum + parseFloat(i.totalAmount), 
          0
        );

        // Saldo final = saldo inicial + receitas - despesas + transferências entrada - transferências saída - faturas pagas
        const finalBalance = 
          initialBalance + 
          income - 
          expenses + 
          transfersInTotal - 
          transfersOutTotal - 
          invoicePaymentsTotal;

        return {
          accountId: account.id,
          accountName: account.name,
          bankName: account.bankName,
          initialBalance,
          income,
          expenses,
          transfersIn: transfersInTotal,
          transfersOut: transfersOutTotal,
          invoicePayments: invoicePaymentsTotal,
          finalBalance,
        };
      })
    );

    return NextResponse.json(balances);
  } catch (error) {
    console.error('Erro ao buscar saldos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar saldos das contas' },
      { status: 500 }
    );
  }
}
