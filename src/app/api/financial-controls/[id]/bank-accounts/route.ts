import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { bankAccounts, financialControlUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: controlId } = await params;

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

    // Buscar contas bancárias
    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.financialControlId, controlId))
      .orderBy(bankAccounts.createdAt);

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Erro ao buscar contas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar contas bancárias' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: controlId } = await params;
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

    // Criar conta bancária
    const [account] = await db
      .insert(bankAccounts)
      .values({
        financialControlId: controlId,
        name: body.name,
        bankName: body.bankName,
        initialBalance: body.initialBalance,
        trackBalance: body.trackBalance || false,
      })
      .returning();

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar conta:', error);
    return NextResponse.json(
      { error: 'Erro ao criar conta bancária' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: controlId } = await params;
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

    // Verificar se a conta pertence ao controle
    const existingAccount = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.id, body.id),
          eq(bankAccounts.financialControlId, controlId)
        )
      )
      .limit(1);

    if (existingAccount.length === 0) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    // Atualizar conta bancária
    const [account] = await db
      .update(bankAccounts)
      .set({
        name: body.name,
        bankName: body.bankName,
        initialBalance: body.initialBalance,
        trackBalance: body.trackBalance,
        updatedAt: new Date(),
      })
      .where(eq(bankAccounts.id, body.id))
      .returning();

    return NextResponse.json(account);
  } catch (error) {
    console.error('Erro ao atualizar conta:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar conta bancária' },
      { status: 500 }
    );
  }
}
