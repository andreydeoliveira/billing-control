import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { expenseIncomeAccounts, financialControlUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET - Listar contas do controle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const resolvedParams = await params;
    const controlId = resolvedParams.id;
    
    console.log('GET /accounts - resolvedParams:', resolvedParams);
    console.log('GET /accounts - controlId:', controlId);

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

    // Buscar contas do controle
    const accountsList = await db
      .select()
      .from(expenseIncomeAccounts)
      .where(eq(expenseIncomeAccounts.financialControlId, controlId))
      .orderBy(expenseIncomeAccounts.name);

    return NextResponse.json({ accounts: accountsList });
  } catch (error) {
    console.error('Erro ao buscar contas:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// POST - Criar nova conta
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const resolvedParams = await params;
    const controlId = resolvedParams.id;
    
    console.log('POST /accounts - controlId:', controlId);

    // Buscar usuário por email se não tiver ID
    let userId: string | undefined = session.user.id;
    if (!userId) {
      const userResult = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, session.user.email!),
      });
      userId = userResult?.id;
    }

    console.log('POST /accounts - userId:', userId);

    if (!userId) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Verificar se o usuário é proprietário
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

    console.log('POST /accounts - userAccess:', userAccess);

    if (userAccess.length === 0) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, type, color, icon } = body;

    console.log('POST /accounts - body:', body);

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Nome e tipo são obrigatórios' },
        { status: 400 }
      );
    }

    if (!['expense', 'income'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo inválido. Use "expense" ou "income"' },
        { status: 400 }
      );
    }

    // Criar conta
    const [newAccount] = await db
      .insert(expenseIncomeAccounts)
      .values({
        financialControlId: controlId,
        name,
        description: description || null,
        type,
        classificationId: body.classificationId || null,
        icon: icon || null,
        isActive: true,
      })
      .returning();

    return NextResponse.json({
      message: 'Conta criada com sucesso',
      account: newAccount,
    });
  } catch (error: any) {
    console.error('Erro ao criar conta:', error);
    console.error('Erro detalhado:', error.message);
    console.error('Stack:', error.stack);
    return NextResponse.json({ 
      error: 'Erro interno do servidor: ' + error.message 
    }, { status: 500 });
  }
}
