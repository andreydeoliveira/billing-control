import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { financialControls, financialControlUsers, financialControlInvites, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/auth';

// GET - Listar membros do controle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    console.log('=== GET /api/financial-controls/[id]/members ===');
    console.log('Session:', session?.user);
    
    if (!session?.user?.email) {
      console.log('ERROR: No user email in session');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: controlId } = await params;

    // Buscar o usuário pelo email se o ID não estiver disponível
    let currentUserId = session.user.id;
    
    if (!currentUserId) {
      console.log('User ID not in session, fetching by email...');
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, session.user.email))
        .limit(1);
      
      if (!currentUser) {
        console.log('ERROR: User not found in database');
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
      }
      
      currentUserId = currentUser.id;
      console.log('User ID fetched:', currentUserId);
    }

    console.log('Control ID:', controlId);
    console.log('Current User ID:', currentUserId);

    // Verificar se o usuário tem acesso ao controle
    const [userAccess] = await db
      .select()
      .from(financialControlUsers)
      .where(
        and(
          eq(financialControlUsers.financialControlId, controlId),
          eq(financialControlUsers.userId, currentUserId)
        )
      )
      .limit(1);

    console.log('User access found:', !!userAccess);

    if (!userAccess) {
      console.log('ERROR: User has no access to this control');
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar informações do controle
    const [control] = await db
      .select()
      .from(financialControls)
      .where(eq(financialControls.id, controlId))
      .limit(1);

    if (!control) {
      return NextResponse.json({ error: 'Controle não encontrado' }, { status: 404 });
    }

    // Buscar todos os membros do controle
    const membersData = await db
      .select({
        id: financialControlUsers.id,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        addedAt: financialControlUsers.createdAt,
      })
      .from(financialControlUsers)
      .innerJoin(users, eq(financialControlUsers.userId, users.id))
      .where(eq(financialControlUsers.financialControlId, controlId));

    console.log('Members found:', membersData.length);
    console.log('Control owner:', control.ownerId);

    // Marcar o proprietário
    const members = membersData.map(member => ({
      ...member,
      isOwner: member.userId === control.ownerId,
      isPending: false,
    }));

    // Buscar convites pendentes (com try-catch para não quebrar se a tabela não existir ainda)
    let pendingMembers: Array<{
      id: string;
      userId: string;
      userName: string | null;
      userEmail: string;
      isOwner: boolean;
      isPending: boolean;
      addedAt: Date;
    }> = [];
    try {
      const pendingInvites = await db
        .select({
          id: financialControlInvites.id,
          userEmail: financialControlInvites.email,
          addedAt: financialControlInvites.createdAt,
        })
        .from(financialControlInvites)
        .where(eq(financialControlInvites.financialControlId, controlId));

      // Adicionar convites pendentes à lista de membros
      pendingMembers = pendingInvites.map(invite => ({
        id: invite.id,
        userId: '',
        userName: null,
        userEmail: invite.userEmail,
        isOwner: false,
        isPending: true,
        addedAt: invite.addedAt,
      }));
    } catch (error) {
      console.log('Tabela de convites ainda não existe no banco:', error instanceof Error ? error.message : 'Unknown error');
    }

    const allMembers = [...members, ...pendingMembers];

    return NextResponse.json({
      control: {
        name: control.name,
        isOwner: control.ownerId === currentUserId,
      },
      members: allMembers,
    });
  } catch (error) {
    console.error('Erro ao listar membros:', error);
    return NextResponse.json(
      { error: 'Erro ao listar membros' },
      { status: 500 }
    );
  }
}

// POST - Adicionar membro ao controle
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== POST /api/financial-controls/[id]/members ===');
    
    const session = await auth();
    console.log('Session:', session?.user);
    
    if (!session?.user?.email) {
      console.log('Unauthorized - No session email');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: controlId } = await params;
    const body = await request.json();
    const { email } = body;

    console.log('Control ID:', controlId);
    console.log('Email to add:', email);

    if (!email) {
      console.log('Missing email parameter');
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    // Buscar o usuário atual pelo email se o ID não estiver disponível
    let currentUserId = session.user.id;
    
    if (!currentUserId) {
      console.log('User ID not in session, fetching by email...');
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, session.user.email))
        .limit(1);
      
      if (!currentUser) {
        console.log('ERROR: Current user not found in database');
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
      }
      
      currentUserId = currentUser.id;
      console.log('Current user ID fetched:', currentUserId);
    }

    console.log('Current user ID:', currentUserId);

    // Verificar se é o proprietário
    console.log('Checking if user is control owner...');
    const [control] = await db
      .select()
      .from(financialControls)
      .where(eq(financialControls.id, controlId))
      .limit(1);

    if (!control) {
      console.log('ERROR: Control not found');
      return NextResponse.json({ error: 'Controle não encontrado' }, { status: 404 });
    }

    console.log('Control found:', control.name);
    console.log('Control owner ID:', control.ownerId);
    console.log('Is owner?', control.ownerId === currentUserId);

    if (control.ownerId !== currentUserId) {
      console.log('ERROR: User is not the owner');
      return NextResponse.json(
        { error: 'Apenas o proprietário pode adicionar membros' },
        { status: 403 }
      );
    }

    // Buscar o usuário a ser adicionado
    console.log('Searching for user with email:', email);
    const [userToAdd] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!userToAdd) {
      console.log('User not found in database. Creating pending invite...');
      
      try {
        // Verificar se já existe um convite pendente
        const [existingInvite] = await db
          .select()
          .from(financialControlInvites)
          .where(
            and(
              eq(financialControlInvites.financialControlId, controlId),
              eq(financialControlInvites.email, email)
            )
          )
          .limit(1);

        if (existingInvite) {
          console.log('Invite already exists');
          return NextResponse.json(
            { error: 'Este email já foi convidado' },
            { status: 400 }
          );
        }

        // Criar convite pendente
        await db.insert(financialControlInvites).values({
          financialControlId: controlId,
          email: email,
          invitedBy: currentUserId,
        });

        console.log('Pending invite created successfully');
        return NextResponse.json({ 
          success: true,
          message: 'Convite enviado. O usuário terá acesso assim que criar uma conta.'
        });
      } catch (inviteError) {
        console.error('Erro ao criar convite (tabela pode não existir ainda):', inviteError);
        return NextResponse.json(
          { error: 'Usuário não encontrado. Ele precisa criar uma conta primeiro. (Sistema de convites não disponível ainda)' },
          { status: 404 }
        );
      }
    }

    console.log('User found:', userToAdd.email, 'ID:', userToAdd.id);

    // Verificar se já é membro
    const [existingMember] = await db
      .select()
      .from(financialControlUsers)
      .where(
        and(
          eq(financialControlUsers.financialControlId, controlId),
          eq(financialControlUsers.userId, userToAdd.id)
        )
      )
      .limit(1);

    if (existingMember) {
      console.log('ERROR: User is already a member');
      return NextResponse.json(
        { error: 'Este usuário já é membro do controle' },
        { status: 400 }
      );
    }

    console.log('User is not a member yet. Adding...');

    // Adicionar membro
    const [newMember] = await db.insert(financialControlUsers).values({
      financialControlId: controlId,
      userId: userToAdd.id,
    }).returning();

    console.log('SUCCESS: Member added with ID:', newMember.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('=== ERRO CRÍTICO AO ADICIONAR MEMBRO ===');
    console.error('Error:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { 
        error: 'Erro ao adicionar membro',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}

// DELETE - Remover membro do controle
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { id: controlId } = await params;
    const body = await request.json();
    const { memberId } = body;

    if (!memberId) {
      return NextResponse.json({ error: 'ID do membro é obrigatório' }, { status: 400 });
    }

    // Buscar o usuário atual pelo email se o ID não estiver disponível
    let currentUserId = session.user.id;
    
    if (!currentUserId) {
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, session.user.email))
        .limit(1);
      
      if (!currentUser) {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
      }
      
      currentUserId = currentUser.id;
    }

    // Verificar se é o proprietário
    const [control] = await db
      .select()
      .from(financialControls)
      .where(eq(financialControls.id, controlId))
      .limit(1);

    if (!control) {
      return NextResponse.json({ error: 'Controle não encontrado' }, { status: 404 });
    }

    if (control.ownerId !== currentUserId) {
      return NextResponse.json(
        { error: 'Apenas o proprietário pode remover membros' },
        { status: 403 }
      );
    }

    // Buscar o membro a ser removido (pode ser membro real ou convite pendente)
    const [member] = await db
      .select()
      .from(financialControlUsers)
      .where(eq(financialControlUsers.id, memberId))
      .limit(1);

    if (member) {
      // Não pode remover o proprietário
      if (member.userId === control.ownerId) {
        return NextResponse.json(
          { error: 'Não é possível remover o proprietário' },
          { status: 400 }
        );
      }

      // Remover membro
      await db
        .delete(financialControlUsers)
        .where(eq(financialControlUsers.id, memberId));

      return NextResponse.json({ success: true });
    }

    // Se não é um membro, pode ser um convite pendente
    const [invite] = await db
      .select()
      .from(financialControlInvites)
      .where(eq(financialControlInvites.id, memberId))
      .limit(1);

    if (!invite) {
      return NextResponse.json({ error: 'Membro ou convite não encontrado' }, { status: 404 });
    }

    // Remover convite pendente
    await db
      .delete(financialControlInvites)
      .where(eq(financialControlInvites.id, memberId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover membro:', error);
    return NextResponse.json(
      { error: 'Erro ao remover membro' },
      { status: 500 }
    );
  }
}
