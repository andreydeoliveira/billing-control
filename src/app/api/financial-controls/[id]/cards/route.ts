import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { cards, financialControlUsers } from '@/db/schema';
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

    // Buscar cartões
    const cardsList = await db
      .select()
      .from(cards)
      .where(eq(cards.financialControlId, controlId))
      .orderBy(cards.createdAt);

    return NextResponse.json(cardsList);
  } catch (error) {
    console.error('Erro ao buscar cartões:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar cartões' },
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

    // Criar cartão
    const [card] = await db
      .insert(cards)
      .values({
        financialControlId: controlId,
        name: body.name,
        closingDay: body.closingDay,
        dueDay: body.dueDay,
      })
      .returning();

    return NextResponse.json(card, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar cartão:', error);
    return NextResponse.json(
      { error: 'Erro ao criar cartão' },
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

    // Verificar se o cartão pertence ao controle
    const existingCard = await db
      .select()
      .from(cards)
      .where(
        and(
          eq(cards.id, body.id),
          eq(cards.financialControlId, controlId)
        )
      )
      .limit(1);

    if (existingCard.length === 0) {
      return NextResponse.json({ error: 'Cartão não encontrado' }, { status: 404 });
    }

    // Atualizar cartão
    const [card] = await db
      .update(cards)
      .set({
        name: body.name,
        closingDay: body.closingDay,
        dueDay: body.dueDay,
        updatedAt: new Date(),
      })
      .where(eq(cards.id, body.id))
      .returning();

    return NextResponse.json(card);
  } catch (error) {
    console.error('Erro ao atualizar cartão:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar cartão' },
      { status: 500 }
    );
  }
}
