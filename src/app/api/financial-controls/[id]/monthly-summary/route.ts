import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { 
  financialControlUsers, 
  monthlyTransactions,
  expenseIncomeAccounts,
  accountClassifications
} from '@/db/schema';
import { eq, and, sql, gte, lte } from 'drizzle-orm';

// GET /api/financial-controls/[id]/monthly-summary
// Retorna resumo mensal por conta ou por classificação
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

    // Verificar acesso
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

    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get('groupBy') || 'account'; // 'account' ou 'classification'
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const startMonth = `${year}-01`;
    const endMonth = `${year}-12`;

    if (groupBy === 'account') {
      // Agrupar por conta
      const summary = await db
        .select({
          accountId: monthlyTransactions.accountId,
          accountName: expenseIncomeAccounts.name,
          accountType: expenseIncomeAccounts.type,
          classificationId: expenseIncomeAccounts.classificationId,
          classificationName: accountClassifications.name,
          monthYear: monthlyTransactions.monthYear,
          total: sql<number>`COALESCE(SUM(CAST(${monthlyTransactions.actualAmount} AS DECIMAL)), 0)`,
          expectedTotal: sql<number>`COALESCE(SUM(CAST(${monthlyTransactions.expectedAmount} AS DECIMAL)), 0)`,
        })
        .from(monthlyTransactions)
        .leftJoin(expenseIncomeAccounts, eq(monthlyTransactions.accountId, expenseIncomeAccounts.id))
        .leftJoin(accountClassifications, eq(expenseIncomeAccounts.classificationId, accountClassifications.id))
        .where(
          and(
            eq(monthlyTransactions.financialControlId, controlId),
            gte(monthlyTransactions.monthYear, startMonth),
            lte(monthlyTransactions.monthYear, endMonth),
            sql`TRUE`
          )
        )
        .groupBy(
          monthlyTransactions.accountId,
          expenseIncomeAccounts.name,
          expenseIncomeAccounts.type,
          expenseIncomeAccounts.classificationId,
          accountClassifications.name,
          monthlyTransactions.monthYear
        )
        .orderBy(expenseIncomeAccounts.name, monthlyTransactions.monthYear);

      return NextResponse.json(summary);
    } else if (groupBy === 'classification') {
      // Agrupar por classificação
      const summary = await db
        .select({
          classificationId: expenseIncomeAccounts.classificationId,
          classificationName: sql<string>`COALESCE(${accountClassifications.name}, 'Não informado')`,
          accountType: expenseIncomeAccounts.type,
          monthYear: monthlyTransactions.monthYear,
          total: sql<number>`COALESCE(SUM(CAST(${monthlyTransactions.actualAmount} AS DECIMAL)), 0)`,
          expectedTotal: sql<number>`COALESCE(SUM(CAST(${monthlyTransactions.expectedAmount} AS DECIMAL)), 0)`,
        })
        .from(monthlyTransactions)
        .leftJoin(expenseIncomeAccounts, eq(monthlyTransactions.accountId, expenseIncomeAccounts.id))
        .leftJoin(accountClassifications, eq(expenseIncomeAccounts.classificationId, accountClassifications.id))
        .where(
          and(
            eq(monthlyTransactions.financialControlId, controlId),
            gte(monthlyTransactions.monthYear, startMonth),
            lte(monthlyTransactions.monthYear, endMonth),
            sql`TRUE`
          )
        )
        .groupBy(
          expenseIncomeAccounts.classificationId,
          accountClassifications.name,
          expenseIncomeAccounts.type,
          monthlyTransactions.monthYear
        )
        .orderBy(sql`COALESCE(${accountClassifications.name}, 'Não informado')`, monthlyTransactions.monthYear);

      return NextResponse.json(summary);
    } else {
      return NextResponse.json({ error: 'groupBy inválido. Use "account" ou "classification"' }, { status: 400 });
    }
  } catch (error) {
    console.error('Erro ao buscar resumo mensal:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar resumo mensal' },
      { status: 500 }
    );
  }
}
