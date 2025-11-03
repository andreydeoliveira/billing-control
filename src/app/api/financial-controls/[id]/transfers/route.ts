import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { transfers, bankAccounts, financialControlUsers } from '@/db/schema';
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
  const month = searchParams.get('month');

  if (!month) {
    return NextResponse.json({ error: 'Mês não informado' }, { status: 400 });
  }

  try {
    // Verificar acesso
    const userAccess = await db
      .select()
      .from(financialControlUsers)
      .where(
        and(
          eq(financialControlUsers.financialControlId, controlId),
          eq(financialControlUsers.userId, session.user.id)
        )
      )
      .limit(1);

    if (userAccess.length === 0) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar transferências do mês com JOIN para nomes das contas
    const transfersData = await db
      .select({
        id: transfers.id,
        amount: transfers.amount,
        transferDate: transfers.transferDate,
        description: transfers.description,
        fromBankAccountName: bankAccounts.name,
      })
      .from(transfers)
      .leftJoin(bankAccounts, eq(transfers.fromBankAccountId, bankAccounts.id))
      .where(
        and(
          eq(transfers.financialControlId, controlId),
          eq(transfers.monthYear, month)
        )
      );

    // Buscar nomes das contas de destino (segundo JOIN)
    const enrichedTransfers = await Promise.all(
      transfersData.map(async (transfer) => {
        const toAccountData = await db
          .select({ name: bankAccounts.name })
          .from(transfers)
          .leftJoin(bankAccounts, eq(transfers.toBankAccountId, bankAccounts.id))
          .where(eq(transfers.id, transfer.id))
          .limit(1);

        return {
          ...transfer,
          toBankAccountName: toAccountData[0]?.name || 'Conta não encontrada',
        };
      })
    );

    return NextResponse.json(enrichedTransfers);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar transferências' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: controlId } = await context.params;

  try {
    // Verificar acesso
    const userAccess = await db
      .select()
      .from(financialControlUsers)
      .where(
        and(
          eq(financialControlUsers.financialControlId, controlId),
          eq(financialControlUsers.userId, session.user.id)
        )
      )
      .limit(1);

    if (userAccess.length === 0) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();

    // Validações
    if (!body.fromBankAccountId || !body.toBankAccountId || !body.amount || !body.transferDate || !body.monthYear) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    if (body.fromBankAccountId === body.toBankAccountId) {
      return NextResponse.json({ error: 'Contas de origem e destino devem ser diferentes' }, { status: 400 });
    }

    // Criar transferência
    const [newTransfer] = await db
      .insert(transfers)
      .values({
        financialControlId: controlId,
        fromBankAccountId: body.fromBankAccountId,
        toBankAccountId: body.toBankAccountId,
        amount: body.amount,
        monthYear: body.monthYear,
        transferDate: body.transferDate,
        description: body.description || null,
      })
      .returning();

    return NextResponse.json(newTransfer, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Erro ao criar transferência' }, { status: 500 });
  }
}
