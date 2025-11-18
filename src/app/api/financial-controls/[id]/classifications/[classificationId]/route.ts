import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { accountClassifications, financialControlUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// PATCH /api/financial-controls/[id]/classifications/[classificationId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; classificationId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: controlId, classificationId } = await params;
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

    await db
      .update(accountClassifications)
      .set({
        name: body.name,
        description: body.description || null,
        color: body.color,
        isActive: body.isActive,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(accountClassifications.id, classificationId),
          eq(accountClassifications.financialControlId, controlId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar classificação:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar classificação' },
      { status: 500 }
    );
  }
}

// DELETE /api/financial-controls/[id]/classifications/[classificationId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; classificationId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: controlId, classificationId } = await params;

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

    await db
      .delete(accountClassifications)
      .where(
        and(
          eq(accountClassifications.id, classificationId),
          eq(accountClassifications.financialControlId, controlId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir classificação:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir classificação' },
      { status: 500 }
    );
  }
}
