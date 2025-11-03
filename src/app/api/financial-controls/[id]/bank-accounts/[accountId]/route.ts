import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { bankAccounts, financialControlUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: controlId, accountId } = await params;

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

    // Verificar se a conta pertence ao controle
    const account = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.id, accountId),
          eq(bankAccounts.financialControlId, controlId)
        )
      )
      .limit(1);

    if (account.length === 0) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    // Excluir conta (cascade irá desvincular transações)
    await db
      .delete(bankAccounts)
      .where(eq(bankAccounts.id, accountId));

    return NextResponse.json({ message: 'Conta excluída com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir conta:', error);
    return NextResponse.json(
      { error: 'Erro ao excluir conta bancária' },
      { status: 500 }
    );
  }
}
