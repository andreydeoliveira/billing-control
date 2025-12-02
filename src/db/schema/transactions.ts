import { pgTable, text, timestamp, uuid, numeric, integer, boolean, date } from 'drizzle-orm/pg-core';
import { financialControls } from './financial-controls';
import { bankAccounts, cards, bankAccountBoxes } from './accounts-and-cards';
import { expenseIncomeAccounts } from './accounts';

// Gastos/Recebimentos provisionados (modelo/template)
export const provisionedTransactions = pgTable('provisioned_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  financialControlId: uuid('financial_control_id').notNull().references(() => financialControls.id, { onDelete: 'cascade' }),
  
  // Conta (ex: Luz, Água, Uber, Alimentação) - OBRIGATÓRIO
  // O nome e tipo virão da conta vinculada, não armazenados aqui
  accountId: uuid('account_id').notNull().references(() => expenseIncomeAccounts.id, { onDelete: 'restrict' }),
  
  // Observação adicional (opcional - para detalhes específicos desta provisão)
  observation: text('observation'),
  
  expectedAmount: numeric('expected_amount', { precision: 15, scale: 2 }).notNull(),
  
  // Fonte de pagamento (OPCIONAL: pode ser null = conta a pagar, ou conta bancária, ou cartão)
  bankAccountId: uuid('bank_account_id').references(() => bankAccounts.id, { onDelete: 'set null' }),
  cardId: uuid('card_id').references(() => cards.id, { onDelete: 'set null' }),
  boxId: uuid('box_id').references(() => bankAccountBoxes.id, { onDelete: 'set null' }), // caixinha padrão
  
  // Recorrência
  isRecurring: boolean('is_recurring').notNull().default(false),
  recurrenceType: text('recurrence_type'), // 'monthly' | 'yearly' (só para recorrentes)
  installments: integer('installments'), // número de parcelas (null se não for parcelado)
  currentInstallment: integer('current_installment').default(1), // parcela atual
  startDate: date('start_date'), // data de início das parcelas (quando não é recorrente)
  endDate: date('end_date'), // data final (opcional - quando encerrar assinatura/contrato)
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
