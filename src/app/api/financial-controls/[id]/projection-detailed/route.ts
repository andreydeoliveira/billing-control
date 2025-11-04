import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { provisionedTransactions, financialControlUsers, bankAccounts, expenseIncomeAccounts } from '@/db/schema';
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

    // Buscar contas com controle de saldo ativado
    const accounts = await db.query.bankAccounts.findMany({
      where: and(
        eq(bankAccounts.financialControlId, controlId),
        eq(bankAccounts.trackBalance, true)
      ),
    });

    // Buscar gastos provisionados com informações da conta
    const provisioned = await db
      .select({
        id: provisionedTransactions.id,
        bankAccountId: provisionedTransactions.bankAccountId,
        cardId: provisionedTransactions.cardId,
        accountId: provisionedTransactions.accountId,
        expectedAmount: provisionedTransactions.expectedAmount,
        isRecurring: provisionedTransactions.isRecurring,
        installments: provisionedTransactions.installments,
        currentInstallment: provisionedTransactions.currentInstallment,
        type: expenseIncomeAccounts.type,
        name: expenseIncomeAccounts.name,
      })
      .from(provisionedTransactions)
      .leftJoin(expenseIncomeAccounts, eq(provisionedTransactions.accountId, expenseIncomeAccounts.id))
      .where(eq(provisionedTransactions.financialControlId, controlId));

    // Se não tem contas, retornar vazio
    if (accounts.length === 0) {
      return NextResponse.json({
        accounts: [],
      });
    }

    // Calcular projeção por conta
    const accountProjections = accounts.map((account) => {
      const monthsData = [];
      let currentBalance = parseFloat(account.initialBalance || '0');

      for (let i = 1; i <= months; i++) {
        const now = new Date();
        const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        
        let expectedIncome = 0;
        let expectedExpenses = 0;
        const transactions: {
          name: string;
          type: string;
          amount: number;
          isRecurring: boolean;
          installments: number | null;
          currentInstallment: number | null;
        }[] = [];

        // Considerar apenas os gastos vinculados a esta conta
        // OU dividir gastos de cartão proporcionalmente entre as contas
        provisioned.forEach((transaction) => {
          const amount = parseFloat(transaction.expectedAmount);
          
          // Pular se não for recorrente nem parcelado ativo
          const isActive = transaction.isRecurring || 
            (transaction.installments && transaction.currentInstallment !== null && 
             i <= (transaction.installments - transaction.currentInstallment));
          
          if (!isActive) return;

          let includeInAccount = false;
          const actualAmount = amount;

          // Se for desta conta bancária especificamente
          if (transaction.bankAccountId === account.id) {
            if (transaction.type === 'income') {
              expectedIncome += amount;
            } else {
              expectedExpenses += amount;
            }
            includeInAccount = true;
          }
          // Se for de cartão, só inclui na primeira conta (não dividir)
          else if (transaction.cardId && accounts.indexOf(account) === 0) {
            if (transaction.type === 'expense') {
              expectedExpenses += amount;
              includeInAccount = true;
            }
          }
            if (transaction.type === 'income') {
              expectedIncome += actualAmount;
            } else {
          }

          if (includeInAccount) {
            transactions.push({
              name: transaction.name || 'Sem nome',
              type: transaction.type || 'expense',
              amount: actualAmount,
              isRecurring: transaction.isRecurring,
              installments: transaction.installments,
              currentInstallment: transaction.currentInstallment,
            });
          }
        });

        const initialBalance = currentBalance;
        const finalBalance = initialBalance + expectedIncome - expectedExpenses;
        currentBalance = finalBalance;

        monthsData.push({
          month: `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`,
          monthName: targetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
          initialBalance,
          expectedIncome,
          expectedExpenses,
          finalBalance,
          transactions,
        });
      }

      return {
        accountId: account.id,
        accountName: account.name,
        bankName: account.bankName,
        months: monthsData,
      };
    });

    return NextResponse.json({
      accounts: accountProjections,
    });
  } catch (error) {
    console.error('Erro ao calcular projeção detalhada:', error);
    return NextResponse.json(
      { error: 'Erro ao calcular projeção' },
      { status: 500 }
    );
  }
}
