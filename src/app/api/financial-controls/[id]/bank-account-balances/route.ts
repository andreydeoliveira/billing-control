import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { 
  bankAccountMonthlyBalances, 
  financialControlUsers, 
  bankAccounts
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/financial-controls/[id]/bank-account-balances
// Retorna todos os saldos mensais registrados
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
    const bankAccountId = searchParams.get('bankAccountId');
    const monthYear = searchParams.get('monthYear');

    const whereConditions = [eq(bankAccountMonthlyBalances.financialControlId, controlId)];

    if (bankAccountId) {
      whereConditions.push(eq(bankAccountMonthlyBalances.bankAccountId, bankAccountId));
    }

    if (monthYear) {
      whereConditions.push(eq(bankAccountMonthlyBalances.monthYear, monthYear));
    }

    const balances = await db
      .select({
        id: bankAccountMonthlyBalances.id,
        bankAccountId: bankAccountMonthlyBalances.bankAccountId,
        bankAccountName: bankAccounts.name,
        monthYear: bankAccountMonthlyBalances.monthYear,
        finalBalance: bankAccountMonthlyBalances.finalBalance,
        yield: bankAccountMonthlyBalances.yield,
        observation: bankAccountMonthlyBalances.observation,
        createdAt: bankAccountMonthlyBalances.createdAt,
      })
      .from(bankAccountMonthlyBalances)
      .leftJoin(bankAccounts, eq(bankAccountMonthlyBalances.bankAccountId, bankAccounts.id))
      .where(and(...whereConditions))
      .orderBy(bankAccountMonthlyBalances.monthYear);

    return NextResponse.json(balances);
  } catch (error) {
    console.error('Erro ao buscar saldos:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar saldos' },
      { status: 500 }
    );
  }
}

// POST /api/financial-controls/[id]/bank-account-balances
// Cria ou atualiza um saldo mensal e calcula o rendimento
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

    const { bankAccountId, monthYear, finalBalance, observation } = body;

    if (!bankAccountId || !monthYear || finalBalance === undefined || finalBalance === null) {
      return NextResponse.json(
        { error: 'bankAccountId, monthYear e finalBalance são obrigatórios' },
        { status: 400 }
      );
    }

    // Buscar a conta bancária para pegar o saldo inicial
    const [account] = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.id, bankAccountId),
          eq(bankAccounts.financialControlId, controlId)
        )
      )
      .limit(1);

    if (!account) {
      return NextResponse.json({ error: 'Conta bancária não encontrada' }, { status: 404 });
    }

    // Calcular o saldo esperado baseado em movimentações
    // Usar SQL diretamente para fazer os cálculos
    
    // Calcular rendimento de forma simples:
    // Rendimento = finalBalance informado - saldo calculado pelas transações
    // Por enquanto vou simplificar e deixar que o frontend calcule ou o usuário informe manualmente
    
    const yieldAmount = 0; // Será calculado posteriormente quando implementarmos a lógica completa

    // Verificar se já existe um registro para este mês e conta
    const [existing] = await db
      .select()
      .from(bankAccountMonthlyBalances)
      .where(
        and(
          eq(bankAccountMonthlyBalances.financialControlId, controlId),
          eq(bankAccountMonthlyBalances.bankAccountId, bankAccountId),
          eq(bankAccountMonthlyBalances.monthYear, monthYear)
        )
      )
      .limit(1);

    if (existing) {
      // Atualizar
      await db
        .update(bankAccountMonthlyBalances)
        .set({
          finalBalance,
          yield: yieldAmount.toFixed(2),
          observation: observation || null,
          updatedAt: new Date(),
        })
        .where(eq(bankAccountMonthlyBalances.id, existing.id));

      return NextResponse.json({ 
        id: existing.id,
        yield: yieldAmount.toFixed(2),
      });
    } else {
      // Criar novo
      const [newBalance] = await db
        .insert(bankAccountMonthlyBalances)
        .values({
          financialControlId: controlId,
          bankAccountId,
          monthYear,
          finalBalance,
          yield: yieldAmount.toFixed(2),
          observation: observation || null,
        })
        .returning();

      return NextResponse.json({ 
        id: newBalance.id,
        yield: yieldAmount.toFixed(2),
      });
    }
  } catch (error) {
    console.error('Erro ao salvar saldo:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar saldo' },
      { status: 500 }
    );
  }
}
