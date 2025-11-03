import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/db';
import { 
  provisionedTransactions, 
  monthlyTransactions, 
  cardInvoices,
  financialControlUsers,
  cards 
} from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { id: controlId } = await context.params;
  const body = await request.json();
  const { monthYear } = body; // formato: 'YYYY-MM'

  if (!monthYear) {
    return NextResponse.json({ error: 'Mês não informado' }, { status: 400 });
  }

  try {
    // Verificar acesso
    const userAccess = await db
      .select()
      .from(financialControlUsers)
      .where(
        and(
          eq(financialControlUsers.financialControlId, controlId),
          eq(financialControlUsers.userId, session.user.id)
        )
      )
      .limit(1);

    if (userAccess.length === 0) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar todos os gastos provisionados do controle
    const provisioned = await db
      .select()
      .from(provisionedTransactions)
      .where(eq(provisionedTransactions.financialControlId, controlId));

    const createdTransactions = [];
    const updatedInvoices = new Map<string, number>(); // cardId -> totalAmount

    // Parse do mês alvo para comparações
    const [targetYear, targetMonth] = monthYear.split('-').map(Number);

    for (const prov of provisioned) {
      let shouldCreateTransaction = false;

      // Verificar se deve criar transação
      if (prov.isRecurring) {
        // Recorrente: sempre cria
        shouldCreateTransaction = true;
      } else if (prov.installments && prov.currentInstallment && prov.currentInstallment <= prov.installments) {
        // Parcelado: verificar se deve criar baseado no startDate
        shouldCreateTransaction = true;
        
        // Se tem startDate, verificar se já chegou no mês de início
        if (prov.startDate) {
          const startDate = new Date(prov.startDate);
          const startYear = startDate.getFullYear();
          const startMonth = startDate.getMonth();
          
          // Só cria se o mês alvo for >= mês de início
          if (targetYear < startYear || (targetYear === startYear && targetMonth - 1 < startMonth)) {
            shouldCreateTransaction = false;
          }
        }
      }

      if (shouldCreateTransaction) {
        // Verificar se já existe transação deste provisionado neste mês
        const existingTransaction = await db
          .select()
          .from(monthlyTransactions)
          .where(
            and(
              eq(monthlyTransactions.provisionedTransactionId, prov.id),
              eq(monthlyTransactions.monthYear, monthYear)
            )
          )
          .limit(1);

        if (existingTransaction.length === 0) {
          // Determinar paymentMethod baseado na fonte
          let paymentMethod = 'bank_account';
          if (prov.cardId) {
            paymentMethod = 'credit_card';
          }

          // Criar transação mensal
          const [newTransaction] = await db
            .insert(monthlyTransactions)
            .values({
              financialControlId: controlId,
              provisionedTransactionId: prov.id,
              accountId: prov.accountId, // Vincular à conta (Luz, Água, etc)
              observation: prov.observation,
              expectedAmount: prov.expectedAmount,
              actualAmount: null, // Não foi pago ainda
              monthYear: monthYear,
              paidDate: null,
              paymentMethod: paymentMethod,
              bankAccountId: prov.bankAccountId,
              cardId: prov.cardId,
              installmentNumber: prov.isRecurring ? null : prov.currentInstallment,
              totalInstallments: prov.installments,
            })
            .returning();

          createdTransactions.push(newTransaction);

          // Se for cartão, acumular para fatura
          if (prov.cardId) {
            const currentTotal = updatedInvoices.get(prov.cardId) || 0;
            updatedInvoices.set(
              prov.cardId, 
              currentTotal + parseFloat(prov.expectedAmount)
            );
          }

          // Se for parcelado, avançar parcela
          if (!prov.isRecurring && prov.installments && prov.currentInstallment) {
            await db
              .update(provisionedTransactions)
              .set({
                currentInstallment: prov.currentInstallment + 1,
              })
              .where(eq(provisionedTransactions.id, prov.id));
          }
        }
      }
    }

    // Criar/Atualizar faturas de cartão
    for (const [cardId, totalAmount] of updatedInvoices.entries()) {
      // Buscar fatura existente
      const existingInvoice = await db
        .select()
        .from(cardInvoices)
        .where(
          and(
            eq(cardInvoices.financialControlId, controlId),
            eq(cardInvoices.cardId, cardId),
            eq(cardInvoices.monthYear, monthYear)
          )
        )
        .limit(1);

      if (existingInvoice.length > 0) {
        // Atualizar fatura existente
        const currentTotal = parseFloat(existingInvoice[0].totalAmount);
        await db
          .update(cardInvoices)
          .set({
            totalAmount: String(currentTotal + totalAmount),
          })
          .where(eq(cardInvoices.id, existingInvoice[0].id));

        // Vincular transações à fatura
        await db
          .update(monthlyTransactions)
          .set({ cardInvoiceId: existingInvoice[0].id })
          .where(
            and(
              eq(monthlyTransactions.cardId, cardId),
              eq(monthlyTransactions.monthYear, monthYear),
              isNull(monthlyTransactions.cardInvoiceId)
            )
          );
      } else {
        // Buscar informações do cartão (dia de fechamento e vencimento)
        const [cardData] = await db
          .select()
          .from(cards)
          .where(eq(cards.id, cardId))
          .limit(1);

        // Calcular data de vencimento (se tiver)
        let dueDate = null;
        if (cardData?.dueDay) {
          const [year, month] = monthYear.split('-');
          dueDate = `${year}-${month}-${cardData.dueDay.padStart(2, '0')}`;
        }

        // Criar nova fatura
        const [newInvoice] = await db
          .insert(cardInvoices)
          .values({
            financialControlId: controlId,
            cardId: cardId,
            monthYear: monthYear,
            totalAmount: String(totalAmount),
            dueDate: dueDate,
            isPaid: false,
          })
          .returning();

        // Vincular transações à nova fatura
        await db
          .update(monthlyTransactions)
          .set({ cardInvoiceId: newInvoice.id })
          .where(
            and(
              eq(monthlyTransactions.cardId, cardId),
              eq(monthlyTransactions.monthYear, monthYear)
            )
          );
      }
    }

    // Garantir que TODOS os cartões tenham fatura, mesmo sem transações
    const allCards = await db
      .select()
      .from(cards)
      .where(eq(cards.financialControlId, controlId));

    for (const card of allCards) {
      // Verificar se já existe fatura para este cartão neste mês
      const existingInvoice = await db
        .select()
        .from(cardInvoices)
        .where(
          and(
            eq(cardInvoices.financialControlId, controlId),
            eq(cardInvoices.cardId, card.id),
            eq(cardInvoices.monthYear, monthYear)
          )
        )
        .limit(1);

      if (existingInvoice.length === 0) {
        // Criar fatura com valor zero
        let dueDate = null;
        if (card.dueDay) {
          const [year, month] = monthYear.split('-');
          dueDate = `${year}-${month}-${card.dueDay.padStart(2, '0')}`;
        }

        await db
          .insert(cardInvoices)
          .values({
            financialControlId: controlId,
            cardId: card.id,
            monthYear: monthYear,
            totalAmount: '0',
            dueDate: dueDate,
            isPaid: false,
          });
      }
    }

    return NextResponse.json({
      success: true,
      message: `${createdTransactions.length} transações geradas`,
      createdCount: createdTransactions.length,
      invoicesUpdated: updatedInvoices.size,
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao gerar transações:', error);
    return NextResponse.json({ error: 'Erro ao gerar transações mensais' }, { status: 500 });
  }
}
