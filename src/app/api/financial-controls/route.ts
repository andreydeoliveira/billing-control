import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { financialControls, financialControlUsers } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    // Buscar controles financeiros do usuário
    const userControls = await db.query.financialControlUsers.findMany({
      where: eq(financialControlUsers.userId, session.user.id),
      with: {
        financialControl: true,
      },
    });

    const controls = userControls.map(uc => uc.financialControl);

    return NextResponse.json({ controls }, { status: 200 });
  } catch (error) {
    console.error('Erro ao buscar controles:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar controles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    // Criar o controle financeiro
    const [newControl] = await db
      .insert(financialControls)
      .values({
        name,
        ownerId: session.user.id,
      })
      .returning();

    // Adicionar o usuário ao controle
    await db.insert(financialControlUsers).values({
      financialControlId: newControl.id,
      userId: session.user.id,
    });

    return NextResponse.json(
      { 
        message: 'Controle financeiro criado com sucesso',
        control: newControl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar controle:', error);
    return NextResponse.json(
      { error: 'Erro ao criar controle' },
      { status: 500 }
    );
  }
}
