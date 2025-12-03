import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { 
  bankAccounts, 
  financialControlUsers, 
  monthlyTransactions, 
  cardInvoices,
  transfers,
  cards,
  expenseIncomeAccounts,
  bankAccountBoxes
} from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
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
    const currentMonth = dayjs().format('YYYY-MM');

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

    // Funcionalidade de saldo removida temporariamente
    const totalBalance = 0;

    // 1.1 Saldo das caixinhas (baseado em transferências de/para caixinhas)
    // Buscar todas as caixinhas ativas
    const boxes = await db
      .select()
      .from(bankAccountBoxes)
      .where(
        and(
          eq(bankAccountBoxes.financialControlId, controlId),
          eq(bankAccountBoxes.isActive, true)
        )
      );

    // Calcular saldo de cada caixinha
    const boxesBalance: Record<string, { name: string; balance: number }> = {};

    for (const box of boxes) {
      // Somar transferências para esta caixinha (entrada)
      const incomingTransfers = await db
        .select(sql<number>`SUM(CAST(${transfers.amount} AS NUMERIC))`.as('total'))
        .from(transfers)
        .where(eq(transfers.toBoxId, box.id));

      const incomingAmount = parseFloat(incomingTransfers[0]?.total || '0');

      // Somar transferências saindo desta caixinha (saída/resgate)
      const outgoingTransfers = await db
        .select(sql<number>`SUM(CAST(${transfers.amount} AS NUMERIC))`.as('total'))
        .from(transfers)
        .where(eq(transfers.fromBoxId, box.id));

      const outgoingAmount = parseFloat(outgoingTransfers[0]?.total || '0');

      boxesBalance[box.id] = {
        name: box.name,
        balance: incomingAmount - outgoingAmount,
      };
    }

    // 2. Receitas do mês atual (todas as contas)
    const monthlyIncomeTransactions = await db
      .select({ actualAmount: monthlyTransactions.actualAmount })
      .from(monthlyTransactions)
      .leftJoin(expenseIncomeAccounts, eq(monthlyTransactions.accountId, expenseIncomeAccounts.id))
      .where(
        and(
          eq(expenseIncomeAccounts.type, 'income'),
          eq(monthlyTransactions.monthYear, currentMonth),
          sql`${monthlyTransactions.paidDate} IS NOT NULL`
        )
      );

    const monthlyIncome = monthlyIncomeTransactions.reduce(
      (sum, t) => sum + parseFloat(t.actualAmount || '0'),
      0
    );

    // 3. Despesas do mês atual (todas as contas)
    const monthlyExpenseTransactions = await db
      .select({ actualAmount: monthlyTransactions.actualAmount })
      .from(monthlyTransactions)
      .leftJoin(expenseIncomeAccounts, eq(monthlyTransactions.accountId, expenseIncomeAccounts.id))
      .where(
        and(
          eq(expenseIncomeAccounts.type, 'expense'),
          eq(monthlyTransactions.monthYear, currentMonth),
          sql`${monthlyTransactions.paidDate} IS NOT NULL`
        )
      );

    const monthlyExpenses = monthlyExpenseTransactions.reduce(
      (sum, t) => sum + parseFloat(t.actualAmount || '0'),
      0
    );

    // 4. Faturas em aberto do mês atual
    const openInvoices = await db
      .select({ totalAmount: cardInvoices.totalAmount })
      .from(cardInvoices)
      .where(
        and(
          eq(cardInvoices.isPaid, false),
          sql`${cardInvoices.monthYear} = ${currentMonth}`
        )
      );

    const creditCardDebt = openInvoices.reduce(
      (sum, i) => sum + parseFloat(i.totalAmount),
      0
    );

    // 5. Alertas: faturas vencendo nos próximos 7 dias
    const today = dayjs();
    const next7Days = today.add(7, 'day');

    const upcomingInvoices = await db
      .select({
        id: cardInvoices.id,
        cardName: cards.name,
        totalAmount: cardInvoices.totalAmount,
        dueDate: cardInvoices.dueDate,
      })
      .from(cardInvoices)
      .leftJoin(cards, eq(cardInvoices.cardId, cards.id))
      .where(
        and(
          eq(cardInvoices.isPaid, false),
          sql`${cardInvoices.dueDate} >= ${today.toISOString()}`,
          sql`${cardInvoices.dueDate} <= ${next7Days.toISOString()}`
        )
      );

    // 6. Transações não pagas do mês
    const unpaidTransactions = await db
      .select({ id: monthlyTransactions.id })
      .from(monthlyTransactions)
      .where(
        and(
          eq(monthlyTransactions.monthYear, currentMonth),
          sql`${monthlyTransactions.paidDate} IS NULL`
        )
      );

    return NextResponse.json({
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      creditCardDebt,
      boxesBalance, // Saldo das caixinhas
      alerts: {
        upcomingInvoices: upcomingInvoices.length,
        unpaidTransactions: unpaidTransactions.length,
      },
      upcomingInvoicesDetails: upcomingInvoices,
    });
  } catch (error) {
    console.error('Erro ao buscar overview:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar dados da visão geral' },
      { status: 500 }
    );
  }
}
