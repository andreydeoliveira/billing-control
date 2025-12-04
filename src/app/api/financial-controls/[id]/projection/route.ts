import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { provisionedTransactions, financialControlUsers, expenseIncomeAccounts, bankAccountBoxes, transfers } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

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
  const months = parseInt(searchParams.get('months') || '6');

  try {
    // Verificar permissão
    const access = await db.query.financialControlUsers.findFirst({
      where: and(
        eq(financialControlUsers.financialControlId, controlId),
        eq(financialControlUsers.userId, session.user.id)
      ),
    });

    if (!access) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Calcular balance das caixinhas (com uma única query)
    const boxes = await db
      .select()
      .from(bankAccountBoxes)
      .where(and(
        eq(bankAccountBoxes.financialControlId, controlId),
        eq(bankAccountBoxes.isActive, true)
      ));

    // Fetch all transfers at once for all boxes
    const incomingTransfersData = await db
      .select({
        boxId: transfers.toBoxId,
        total: sql<number>`SUM(CAST(${transfers.amount} AS NUMERIC))`,
      })
      .from(transfers)
      .where(
        sql`${transfers.toBoxId} IN (${sql.raw(boxes.map(b => `'${b.id}'`).join(',') || "'null'")})`
      )
      .groupBy(transfers.toBoxId);

    const outgoingTransfersData = await db
      .select({
        boxId: transfers.fromBoxId,
        total: sql<number>`SUM(CAST(${transfers.amount} AS NUMERIC))`,
      })
      .from(transfers)
      .where(
        sql`${transfers.fromBoxId} IN (${sql.raw(boxes.map(b => `'${b.id}'`).join(',') || "'null'")})`
      )
      .groupBy(transfers.fromBoxId);

    const incomingMap = new Map(incomingTransfersData.map(t => [t.boxId, t.total || 0]));
    const outgoingMap = new Map(outgoingTransfersData.map(t => [t.boxId, t.total || 0]));

    const boxesBalance: Record<string, { name: string; balance: number }> = {};
    for (const box of boxes) {
      boxesBalance[box.id] = {
        name: box.name,
        balance: (incomingMap.get(box.id) || 0) - (outgoingMap.get(box.id) || 0),
      };
    }

    // Buscar todos os gastos provisionados com informações da conta
    const provisioned = await db
      .select({
        id: provisionedTransactions.id,
        expectedAmount: provisionedTransactions.expectedAmount,
        isRecurring: provisionedTransactions.isRecurring,
        installments: provisionedTransactions.installments,
        currentInstallment: provisionedTransactions.currentInstallment,
        type: expenseIncomeAccounts.type,
      })
      .from(provisionedTransactions)
      .leftJoin(expenseIncomeAccounts, eq(provisionedTransactions.accountId, expenseIncomeAccounts.id))
      .where(eq(provisionedTransactions.financialControlId, controlId));

    // Calcular projeção para os próximos N meses
    const projections = [];
    const currentDate = new Date();

    for (let i = 1; i <= months; i++) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      
      let expectedIncome = 0;
      let expectedExpenses = 0;

      provisioned.forEach((transaction) => {
        const amount = parseFloat(transaction.expectedAmount);
        
        // Recorrente: sempre inclui
        if (transaction.isRecurring) {
          if (transaction.type === 'income') {
            expectedIncome += amount;
          } else {
            expectedExpenses += amount;
          }
        }
        // Parcelado: inclui se ainda tiver parcelas
        else if (transaction.installments && transaction.currentInstallment !== null) {
          const remainingInstallments = transaction.installments - transaction.currentInstallment;
          if (i <= remainingInstallments) {
            if (transaction.type === 'income') {
              expectedIncome += amount;
            } else {
              expectedExpenses += amount;
            }
          }
        }
      });

      projections.push({
        month: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`,
        monthName: targetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        expectedIncome,
        expectedExpenses,
        balance: expectedIncome - expectedExpenses,
        boxesBalance,
      });
    }

    return NextResponse.json({ projections, boxesBalance });
  } catch (error) {
    console.error('Erro ao calcular projeção:', error);
    return NextResponse.json(
      { error: 'Erro ao calcular projeção' },
      { status: 500 }
    );
  }
}
