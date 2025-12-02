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

    // Permitir mesma conta quando o movimento é entre caixinha e saldo livre
    // Casos permitidos com mesma conta:
    // - Resgate: fromBoxId definido e toBoxId nulo
    // - Aporte para caixinha: toBoxId definido e fromBoxId nulo
    if (body.fromBankAccountId === body.toBankAccountId) {
      const isRescueFromBox = !!body.fromBoxId && !body.toBoxId;
      const isDepositToBox = !!body.toBoxId && !body.fromBoxId;
      if (!isRescueFromBox && !isDepositToBox) {
        return NextResponse.json({ error: 'Contas de origem e destino devem ser diferentes' }, { status: 400 });
      }
    }

    // Se force=true, pular validações de duplicação
    if (!body.force) {
      // Verificar duplicação: mesma origem, destino, valor e data
      const existingTransfer = await db
        .select()
        .from(transfers)
        .where(
          and(
            eq(transfers.financialControlId, controlId),
            eq(transfers.fromBankAccountId, body.fromBankAccountId),
            eq(transfers.toBankAccountId, body.toBankAccountId),
            eq(transfers.amount, body.amount),
            eq(transfers.transferDate, body.transferDate)
          )
        )
        .limit(1);

      if (existingTransfer.length > 0) {
        return NextResponse.json({ 
          error: 'Já existe uma transferência idêntica (mesma origem, destino, valor e data). Se não for duplicata, altere a data ou valor ligeiramente.' 
        }, { status: 409 });
      }

      // Verificar duplicação reversa: mesma operação mas invertida (possível erro do usuário)
      const reverseTransfer = await db
        .select()
        .from(transfers)
        .where(
          and(
            eq(transfers.financialControlId, controlId),
            eq(transfers.fromBankAccountId, body.toBankAccountId),
            eq(transfers.toBankAccountId, body.fromBankAccountId),
            eq(transfers.amount, body.amount),
            eq(transfers.transferDate, body.transferDate)
          )
        )
        .limit(1);

      if (reverseTransfer.length > 0) {
        return NextResponse.json({ 
          error: 'Já existe uma transferência invertida (origem ↔ destino trocados) com mesmo valor e data. Você pode estar duplicando o lançamento.' 
        }, { status: 409 });
      }
    }

    // Criar transferência
    const [newTransfer] = await db
      .insert(transfers)
      .values({
        financialControlId: controlId,
        fromBankAccountId: body.fromBankAccountId,
        toBankAccountId: body.toBankAccountId,
        fromBoxId: body.fromBoxId || null,
        toBoxId: body.toBoxId || null,
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
