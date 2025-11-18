import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { accountClassifications, financialControlUsers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET /api/financial-controls/[id]/classifications
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

    const classifications = await db
      .select()
      .from(accountClassifications)
      .where(eq(accountClassifications.financialControlId, controlId))
      .orderBy(accountClassifications.name);

    return NextResponse.json(classifications);
  } catch (error) {
    console.error('Erro ao buscar classificações:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar classificações' },
      { status: 500 }
    );
  }
}

// POST /api/financial-controls/[id]/classifications
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

    if (!body.name) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    const [classification] = await db
      .insert(accountClassifications)
      .values({
        financialControlId: controlId,
        name: body.name,
        description: body.description || null,
        color: body.color || '#228BE6',
        isActive: true,
      })
      .returning();

    return NextResponse.json(classification);
  } catch (error) {
    console.error('Erro ao criar classificação:', error);
    return NextResponse.json(
      { error: 'Erro ao criar classificação' },
      { status: 500 }
    );
  }
}
