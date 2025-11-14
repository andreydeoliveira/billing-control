import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { cardInvoices, financialControlUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; invoiceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: controlId, invoiceId } = await context.params;

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

    if (!body.bankAccountId || !body.paidDate) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    // Atualizar fatura
    const [updatedInvoice] = await db
      .update(cardInvoices)
      .set({
        isPaid: true,
        paidDate: body.paidDate,
        bankAccountId: body.bankAccountId,
      })
      .where(
        and(
          eq(cardInvoices.id, invoiceId),
          eq(cardInvoices.financialControlId, controlId)
        )
      )
      .returning();

    return NextResponse.json(updatedInvoice);
  } catch {
    return NextResponse.json({ error: 'Erro ao marcar fatura como paga' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; invoiceId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: controlId, invoiceId } = await context.params;

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

    // Desmarcar fatura como paga
    const [updatedInvoice] = await db
      .update(cardInvoices)
      .set({
        isPaid: false,
        paidDate: null,
        bankAccountId: null,
      })
      .where(
        and(
          eq(cardInvoices.id, invoiceId),
          eq(cardInvoices.financialControlId, controlId)
        )
      )
      .returning();

    return NextResponse.json(updatedInvoice);
  } catch {
    return NextResponse.json({ error: 'Erro ao desmarcar pagamento' }, { status: 500 });
  }
}
