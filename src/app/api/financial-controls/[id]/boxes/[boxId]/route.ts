import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { bankAccountBoxes, financialControlUsers, transfers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; boxId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: controlId, boxId } = await params;
    const body = await request.json();

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

    // Verificar se a caixinha pertence ao controle
    const box = await db
      .select()
      .from(bankAccountBoxes)
      .where(
        and(
          eq(bankAccountBoxes.id, boxId),
          eq(bankAccountBoxes.financialControlId, controlId)
        )
      )
      .limit(1);

    if (box.length === 0) {
      return NextResponse.json({ error: 'Caixinha não encontrada' }, { status: 404 });
    }

    // Atualizar isActive
    const [updatedBox] = await db
      .update(bankAccountBoxes)
      .set({
        isActive: body.isActive,
        updatedAt: new Date(),
      })
      .where(eq(bankAccountBoxes.id, boxId))
      .returning();

    return NextResponse.json(updatedBox);
  } catch (error) {
    console.error('Erro ao atualizar caixinha:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar caixinha' },
      { status: 500 }
    );
  }
}

// Transferência entre caixinhas
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; boxId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: controlId, boxId } = await params;
    const body = await request.json();
    const { toBoxId, amount, description } = body;

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

    // Verificar se ambas as caixinhas existem e pertencem ao mesmo banco
    const fromBox = await db
      .select()
      .from(bankAccountBoxes)
      .where(
        and(
          eq(bankAccountBoxes.id, boxId),
          eq(bankAccountBoxes.financialControlId, controlId)
        )
      )
      .limit(1);

    const toBox = await db
      .select()
      .from(bankAccountBoxes)
      .where(
        and(
          eq(bankAccountBoxes.id, toBoxId),
          eq(bankAccountBoxes.financialControlId, controlId)
        )
      )
      .limit(1);

    if (fromBox.length === 0 || toBox.length === 0) {
      return NextResponse.json({ error: 'Caixinha não encontrada' }, { status: 404 });
    }

    // Verificar se são da mesma conta bancária
    if (fromBox[0].bankAccountId !== toBox[0].bankAccountId) {
      return NextResponse.json({ 
        error: 'Transferências entre caixinhas só podem ser feitas na mesma conta bancária' 
      }, { status: 400 });
    }

    // Criar registro de transferência (mesmo banco, entre caixinhas)
    const today = new Date();
    const monthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    const [transfer] = await db
      .insert(transfers)
      .values({
        financialControlId: controlId,
        fromBankAccountId: fromBox[0].bankAccountId,
        toBankAccountId: toBox[0].bankAccountId,
        fromBoxId: boxId,
        toBoxId: toBoxId,
        amount: amount,
        monthYear: monthYear,
        transferDate: today.toISOString().split('T')[0],
        description: description || `Transferência entre caixinhas`,
      })
      .returning();

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    console.error('Erro ao transferir entre caixinhas:', error);
    return NextResponse.json(
      { error: 'Erro ao transferir entre caixinhas' },
      { status: 500 }
    );
  }
}
