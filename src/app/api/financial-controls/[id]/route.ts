import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { financialControlUsers, financialControls } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verificar se o usuário tem acesso a este controle
    const userControl = await db.query.financialControlUsers.findFirst({
      where: and(
        eq(financialControlUsers.financialControlId, id),
        eq(financialControlUsers.userId, session.user.id)
      ),
      with: {
        financialControl: true,
      },
    });

    if (!userControl) {
      return NextResponse.json(
        { error: 'Controle não encontrado ou acesso negado' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { control: userControl.financialControl },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao buscar controle:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar controle' },
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
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Verificar se o usuário tem acesso a este controle
    const userControl = await db.query.financialControlUsers.findFirst({
      where: and(
        eq(financialControlUsers.financialControlId, id),
        eq(financialControlUsers.userId, session.user.id)
      ),
    });

    if (!userControl) {
      return NextResponse.json(
        { error: 'Controle não encontrado ou acesso negado' },
        { status: 404 }
      );
    }

    // Atualizar o controle
    const [updatedControl] = await db
      .update(financialControls)
      .set({
        name: body.name,
        updatedAt: new Date(),
      })
      .where(eq(financialControls.id, id))
      .returning();

    return NextResponse.json(
      { control: updatedControl },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro ao atualizar controle:', error);
    return NextResponse.json(
      { error: 'Erro ao atualizar controle' },
      { status: 500 }
    );
  }
}
