import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { provisionedTransactions, financialControlUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  parseAmount,
  validateInstallments,
} from '@/lib/validation';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; provisionedId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: controlId, provisionedId } = await context.params;

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
    if (!body.accountId) {
      return NextResponse.json(
        { error: 'Selecione uma conta (ex: Luz, Água, Uber)' },
        { status: 400 }
      );
    }

    const validatedAmount = parseAmount(body.expectedAmount).toString();
    const validatedInstallments = validateInstallments(body.installments);

    // Validar que ao menos uma fonte de pagamento foi fornecida
    if (!body.bankAccountId && !body.cardId) {
      return NextResponse.json(
        { error: 'Selecione ao menos uma fonte de pagamento (conta bancária ou cartão)' },
        { status: 400 }
      );
    }

    // Validar que apenas uma fonte foi fornecida
    if (body.bankAccountId && body.cardId) {
      return NextResponse.json(
        { error: 'Selecione apenas uma fonte de pagamento' },
        { status: 400 }
      );
    }

    // Atualizar provisionado
    await db
      .update(provisionedTransactions)
      .set({
        accountId: body.accountId,
        observation: body.observation || null,
        expectedAmount: validatedAmount,
        bankAccountId: body.bankAccountId || null,
        cardId: body.cardId || null,
        isRecurring: body.isRecurring,
        installments: validatedInstallments,
        startDate: body.startDate || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(provisionedTransactions.id, provisionedId),
          eq(provisionedTransactions.financialControlId, controlId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    // Log estruturado
    console.error('[SECURITY] Error updating provisioned transaction:', {
      timestamp: new Date().toISOString(),
      userId: session.user.id,
      controlId,
      provisionedId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Retornar erro específico se for de validação
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Erro ao atualizar provisionado' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; provisionedId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: controlId, provisionedId } = await context.params;

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

    // Deletar provisionado (transações mensais relacionadas serão mantidas)
    await db
      .delete(provisionedTransactions)
      .where(
        and(
          eq(provisionedTransactions.id, provisionedId),
          eq(provisionedTransactions.financialControlId, controlId)
        )
      );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao deletar provisionado' }, { status: 500 });
  }
}
