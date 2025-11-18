import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { expenseIncomeAccounts } from '@/db/schema/accounts';
import { eq } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: controlId } = await params;
    const body = await request.json();

    const [newAccount] = await db
      .insert(expenseIncomeAccounts)
      .values({
        financialControlId: controlId,
        name: body.name,
        type: body.type,
      })
      .returning();

    return NextResponse.json(newAccount);
  } catch (error) {
    console.error('Error creating expense-income account:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: controlId } = await params;

    const accounts = await db
      .select()
      .from(expenseIncomeAccounts)
      .where(eq(expenseIncomeAccounts.financialControlId, controlId))
      .orderBy(expenseIncomeAccounts.name);

    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Error fetching expense-income accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}
