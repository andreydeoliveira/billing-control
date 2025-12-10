import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { provisionedTransactions, financialControlUsers, bankAccounts, expenseIncomeAccounts, bankAccountBoxes, monthlyTransactions, transfers } from '@/db/schema';
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

    // Buscar contas bancárias do controle
    const accounts = await db
      .select({ id: bankAccounts.id, name: bankAccounts.name, bankName: bankAccounts.bankName, initialBalance: bankAccounts.initialBalance })
      .from(bankAccounts)
      .where(and(eq(bankAccounts.financialControlId, controlId), eq(bankAccounts.isActive, true)));
    // Filtrar apenas contas ativas para a projeção
    // Deduplicar por (name + bankName)
    const uniqueMap = new Map<string, (typeof accounts)[number]>();
    for (const acc of accounts) {
      const key = `${String(acc.name)}||${String(acc.bankName)}`.toLowerCase();
      if (!uniqueMap.has(key)) uniqueMap.set(key, acc);
    }
    const activeAccounts = Array.from(uniqueMap.values());

    // Buscar caixinhas por conta
    const boxes = await db
      .select({ id: bankAccountBoxes.id, bankAccountId: bankAccountBoxes.bankAccountId })
      .from(bankAccountBoxes)
      .where(eq(bankAccountBoxes.financialControlId, controlId));
    const boxByAccount = new Map<string, Set<string>>();
    boxes.forEach(b => {
      const accId = b.bankAccountId as unknown as string;
      const set = boxByAccount.get(accId) || new Set<string>();
      set.add(b.id as unknown as string);
      boxByAccount.set(accId, set);
    });

    // Buscar todas provisionadas com tipo (income/expense) e vínculo opcional à conta bancária
    const provisioned = await db
      .select({
        id: provisionedTransactions.id,
        expectedAmount: provisionedTransactions.expectedAmount,
        isRecurring: provisionedTransactions.isRecurring,
        installments: provisionedTransactions.installments,
        currentInstallment: provisionedTransactions.currentInstallment,
        bankAccountId: provisionedTransactions.bankAccountId,
        boxId: provisionedTransactions.boxId,
        type: expenseIncomeAccounts.type,
      })
      .from(provisionedTransactions)
      .leftJoin(expenseIncomeAccounts, eq(provisionedTransactions.accountId, expenseIncomeAccounts.id))
      .where(eq(provisionedTransactions.financialControlId, controlId));

    // Base de saldo inicial: usar saldo inicial da conta.
    // Evitamos chamada interna a outra rota para não depender de cookies.
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const balanceMap = new Map<string, number>();
    
    // Buscar TODAS as transações do mês atual de uma vez (não em loop)
    const allTxs = await db
      .select({ amount: monthlyTransactions.actualAmount, type: expenseIncomeAccounts.type, bankAccountId: monthlyTransactions.bankAccountId })
      .from(monthlyTransactions)
      .leftJoin(expenseIncomeAccounts, eq(monthlyTransactions.accountId, expenseIncomeAccounts.id))
      .where(
        and(
          eq(monthlyTransactions.financialControlId, controlId),
          eq(monthlyTransactions.monthYear, currentMonth),
          sql`${monthlyTransactions.paidDate} IS NOT NULL`
        )
      );
    
    // Buscar TODOS os transfers do mês atual de uma vez
    const allTransfersIn = await db
      .select({ amount: transfers.amount, fromId: transfers.fromBankAccountId, toBankAccountId: transfers.toBankAccountId })
      .from(transfers)
      .where(and(eq(transfers.financialControlId, controlId), eq(transfers.monthYear, currentMonth)));
    
    const allTransfersOut = await db
      .select({ amount: transfers.amount, toId: transfers.toBankAccountId, fromBankAccountId: transfers.fromBankAccountId })
      .from(transfers)
      .where(and(eq(transfers.financialControlId, controlId), eq(transfers.monthYear, currentMonth)));
    
    // Calcular saldo para cada conta em memória (sem queries em loop)
    for (const acc of activeAccounts) {
      const initial = parseFloat((acc.initialBalance as unknown as string) || '0');
      const incomeSum = allTxs
        .filter(t => t.type === 'income' && t.bankAccountId === acc.id)
        .reduce((s, t) => s + parseFloat(t.amount || '0'), 0);
      const expenseSum = allTxs
        .filter(t => t.type === 'expense' && t.bankAccountId === acc.id)
        .reduce((s, t) => s + parseFloat(t.amount || '0'), 0);
      const transferInSum = allTransfersIn
        .filter(t => t.toBankAccountId === acc.id && t.fromId !== acc.id)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const transferOutSum = allTransfersOut
        .filter(t => t.fromBankAccountId === acc.id && t.toId !== acc.id)
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const finalBalanceCurrent = initial + incomeSum - expenseSum + transferInSum - transferOutSum;
      balanceMap.set(acc.id as unknown as string, finalBalanceCurrent);
    }

    const accountsOut: Array<{ accountId: string; accountName: string; bankName: string; months: any[] }> = [];

    for (const acc of accounts) {
      let lastBalance = balanceMap.has(acc.id as unknown as string)
        ? (balanceMap.get(acc.id as unknown as string) as number)
        : parseFloat((acc.initialBalance as unknown as string) || '0');

      const monthsOut: any[] = [];
      // Incluir mês atual (i = 0) e próximos
      for (let i = 0; i <= months; i++) {
        const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const monthStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
        const monthName = targetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

        let expectedIncome = 0;
        let expectedExpenses = 0;
        const provisionedList: Array<{ name: string; type: string; amount: number; isRecurring: boolean; installments: number | null; currentInstallment: number | null }> = [];
        const paidTxList: Array<{ name: string; type: string; amount: number }> = [];
        const transfersList: Array<{ direction: 'in' | 'out'; amount: number }> = [];

        provisioned.forEach((pt) => {
          // Se não encontrou tipo (join não bateu), ignorar para evitar erro de tipo
          if (!pt.type) return;
          // Se houver bankAccountId diferente, ignorar; se não houver, considerar na projeção agregada desta conta (regra simples)
          if (pt.bankAccountId && pt.bankAccountId !== acc.id) return;
          // Se estiver vinculado a caixinha desta conta, incluir
          const accBoxes = boxByAccount.get(acc.id as unknown as string);
          if (accBoxes && (pt as any).boxId && !accBoxes.has((pt as any).boxId as string)) return;
          const amount = parseFloat(pt.expectedAmount as unknown as string);

          // Recorrentes entram todo mês
          if (pt.isRecurring) {
            if (pt.type === 'income') expectedIncome += amount; else expectedExpenses += amount;
            provisionedList.push({ name: 'Recorrente', type: pt.type, amount, isRecurring: true, installments: null, currentInstallment: null });
            return;
          }

          // Parceladas: incluir se ainda há parcelas
          if (pt.installments && pt.currentInstallment != null) {
            const remaining = pt.installments - pt.currentInstallment;
            if (remaining >= i) {
              if (pt.type === 'income') expectedIncome += amount; else expectedExpenses += amount;
              provisionedList.push({ name: 'Parcela', type: pt.type, amount, isRecurring: false, installments: pt.installments, currentInstallment: (pt.currentInstallment + i - 1) });
            }
          }
        });

        // Para o mês atual (i === 0), incluir breakdown de transações pagas e transferências
        if (i === 0) {
          const txsPaid = allTxs.filter(t => t.bankAccountId === acc.id);
          txsPaid.forEach(t => {
            // Ignorar transações sem tipo (join não encontrou conta associada)
            if (!t.type) return;
            const amt = parseFloat(t.amount || '0');
            paidTxList.push({ name: 'Transação', type: t.type, amount: amt });
          });
          const transfersIn = allTransfersIn.filter(t => t.toBankAccountId === acc.id && t.fromId !== acc.id);
          const transfersOut = allTransfersOut.filter(t => t.fromBankAccountId === acc.id && t.toId !== acc.id);
          transfersIn.forEach(t => transfersList.push({ direction: 'in', amount: parseFloat(t.amount) }));
          transfersOut.forEach(t => transfersList.push({ direction: 'out', amount: parseFloat(t.amount) }));
        }

        const finalBalance = lastBalance + expectedIncome - expectedExpenses;
        monthsOut.push({
          month: monthStr,
          monthName,
          initialBalance: lastBalance,
          expectedIncome,
          expectedExpenses,
          finalBalance,
          transactions: provisionedList,
          breakdown: {
            provisioned: provisionedList,
            paidTransactions: paidTxList,
            transfers: transfersList,
          },
        });
        lastBalance = finalBalance;
      }

      accountsOut.push({
        accountId: acc.id as unknown as string,
        accountName: acc.name as unknown as string,
        bankName: acc.bankName as unknown as string,
        months: monthsOut,
      });
    }

    return NextResponse.json({ accounts: accountsOut });
  } catch (error) {
    console.error('Erro ao calcular projeção detalhada:', error);
    return NextResponse.json(
      { error: 'Erro ao calcular projeção' },
      { status: 500 }
    );
  }
}
