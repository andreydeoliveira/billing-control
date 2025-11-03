import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { transfers, financialControlUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { parseAmount, validateDate, sanitizeString } from '@/lib/validation';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; transferId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: controlId, transferId } = await context.params;

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

    // Validações de entrada
    const validatedAmount = parseAmount(body.amount).toString();
    const validatedDate = validateDate(body.transferDate);
    const sanitizedDescription = sanitizeString(body.description, 500);

    if (!validatedDate) {
      return NextResponse.json({ error: 'Data de transferência é obrigatória' }, { status: 400 });
    }

    // Atualizar transferência
    await db
      .update(transfers)
      .set({
        amount: validatedAmount,
        transferDate: validatedDate,
        description: sanitizedDescription,
      })
      .where(
        and(
          eq(transfers.id, transferId),
          eq(transfers.financialControlId, controlId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    // Log estruturado
    console.error('[SECURITY] Error updating transfer:', {
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      controlId,
      transferId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Retornar erro específico se for de validação
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Erro ao atualizar transferência' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; transferId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: controlId, transferId } = await context.params;

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

    // Deletar transferência
    await db
      .delete(transfers)
      .where(
        and(
          eq(transfers.id, transferId),
          eq(transfers.financialControlId, controlId)
        )
      );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao deletar transferência' }, { status: 500 });
  }
}
