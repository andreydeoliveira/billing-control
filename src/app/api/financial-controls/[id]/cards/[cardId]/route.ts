import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { cards, financialControlUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: controlId, cardId } = await params;

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

    // Verificar se o cartão pertence ao controle
    const card = await db
      .select()
      .from(cards)
      .where(
        and(
          eq(cards.id, cardId),
          eq(cards.financialControlId, controlId)
        )
      )
      .limit(1);

    if (card.length === 0) {
      return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 });
    }

    // Excluir cartão (cascade irá desvincular transações)
    await db
      .delete(cards)
      .where(eq(cards.id, cardId));

    return NextResponse.json({ message: 'Cartão excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir cartão:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir cartão' },
      { status: 500 }
    );
  }
}
