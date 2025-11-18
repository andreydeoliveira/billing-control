import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { expenseIncomeAccounts, financialControlUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// PUT - Atualizar conta
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: controlId, accountId } = await params;

    // Buscar usuário por email se não tiver ID
    let userId: string | undefined = session.user.id;
    if (!userId) {
      const userResult = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, session.user.email!),
      });
      userId = userResult?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se o usuário tem acesso ao controle
    const userAccess = await db
      .select()
      .from(financialControlUsers)
      .where(
        and(
          eq(financialControlUsers.userId, userId),
          eq(financialControlUsers.financialControlId, controlId)
        )
      )
      .limit(1);

    if (userAccess.length === 0) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Verificar se a conta existe e pertence ao controle
    const existingAccount = await db
      .select()
      .from(expenseIncomeAccounts)
      .where(
        and(
          eq(expenseIncomeAccounts.id, accountId),
          eq(expenseIncomeAccounts.financialControlId, controlId)
        )
      )
      .limit(1);

    if (existingAccount.length === 0) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, type, classificationId, icon, isActive } = body;

    if (type && !['expense', 'income'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo inválido. Use "expense" ou "income"' },
        { status: 400 }
      );
    }

    // Atualizar conta
    const [updatedAccount] = await db
      .update(expenseIncomeAccounts)
      .set({
        name: name || existingAccount[0].name,
        description: description !== undefined ? description : existingAccount[0].description,
        type: type || existingAccount[0].type,
        classificationId: classificationId !== undefined ? classificationId : existingAccount[0].classificationId,
        icon: icon !== undefined ? icon : existingAccount[0].icon,
        isActive: isActive !== undefined ? isActive : existingAccount[0].isActive,
        updatedAt: new Date(),
      })
      .where(eq(expenseIncomeAccounts.id, accountId))
      .returning();

    return NextResponse.json({
      message: 'Conta atualizada com sucesso',
      account: updatedAccount,
    });
  } catch (error) {
    console.error('Erro ao atualizar conta:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// DELETE - Deletar conta
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; accountId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: controlId, accountId } = await params;

    // Buscar usuário por email se não tiver ID
    let userId: string | undefined = session.user.id;
    if (!userId) {
      const userResult = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, session.user.email!),
      });
      userId = userResult?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se o usuário tem acesso ao controle
    const userAccess = await db
      .select()
      .from(financialControlUsers)
      .where(
        and(
          eq(financialControlUsers.userId, userId),
          eq(financialControlUsers.financialControlId, controlId)
        )
      )
      .limit(1);

    if (userAccess.length === 0) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Verificar se a conta existe e pertence ao controle
    const existingAccount = await db
      .select()
      .from(expenseIncomeAccounts)
      .where(
        and(
          eq(expenseIncomeAccounts.id, accountId),
          eq(expenseIncomeAccounts.financialControlId, controlId)
        )
      )
      .limit(1);

    if (existingAccount.length === 0) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    // Deletar conta
    await db.delete(expenseIncomeAccounts).where(eq(expenseIncomeAccounts.id, accountId));

    return NextResponse.json({
      message: 'Conta deletada com sucesso',
    });
  } catch (error: unknown) {
    console.error('Erro ao deletar conta:', error);
    
    // Se erro de constraint (transações vinculadas)
    if (error && typeof error === 'object' && 'code' in error && error.code === '23503') {
      return NextResponse.json(
        { error: 'Não é possível deletar esta conta pois existem transações vinculadas a ela' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
