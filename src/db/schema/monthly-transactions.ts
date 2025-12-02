import { pgTable, text, timestamp, uuid, numeric, integer, date, boolean } from 'drizzle-orm/pg-core';
import { financialControls } from './financial-controls';
import { bankAccounts, cards, bankAccountBoxes } from './accounts-and-cards';
import { provisionedTransactions } from './transactions';
import { expenseIncomeAccounts } from './accounts';

// Transferências entre contas
export const transfers = pgTable('transfers', {
  id: uuid('id').defaultRandom().primaryKey(),
  financialControlId: uuid('financial_control_id').notNull().references(() => financialControls.id, { onDelete: 'cascade' }),
  fromBankAccountId: uuid('from_bank_account_id').notNull().references(() => bankAccounts.id, { onDelete: 'cascade' }),
  toBankAccountId: uuid('to_bank_account_id').notNull().references(() => bankAccounts.id, { onDelete: 'cascade' }),
  fromBoxId: uuid('from_box_id').references(() => bankAccountBoxes.id, { onDelete: 'set null' }), // caixinha de origem
  toBoxId: uuid('to_box_id').references(() => bankAccountBoxes.id, { onDelete: 'set null' }), // caixinha de destino
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  monthYear: text('month_year').notNull(), // formato: 'YYYY-MM'
  transferDate: date('transfer_date').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Faturas de Cartão (mensais)
export const cardInvoices = pgTable('card_invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  financialControlId: uuid('financial_control_id').notNull().references(() => financialControls.id, { onDelete: 'cascade' }),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  monthYear: text('month_year').notNull(), // formato: 'YYYY-MM'
  totalAmount: numeric('total_amount', { precision: 15, scale: 2 }).notNull().default('0'),
  dueDate: date('due_date'), // data de vencimento
  paidDate: date('paid_date'), // quando foi paga
  isPaid: boolean('is_paid').notNull().default(false),
  bankAccountId: uuid('bank_account_id').references(() => bankAccounts.id, { onDelete: 'set null' }), // conta que pagou a fatura
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Lançamentos mensais (instâncias reais para cada mês)
export const monthlyTransactions = pgTable('monthly_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  financialControlId: uuid('financial_control_id').notNull().references(() => financialControls.id, { onDelete: 'cascade' }),
  provisionedTransactionId: uuid('provisioned_transaction_id').references(() => provisionedTransactions.id, { onDelete: 'set null' }),
  cardInvoiceId: uuid('card_invoice_id').references(() => cardInvoices.id, { onDelete: 'set null' }), // vínculo com fatura do cartão
  transferId: uuid('transfer_id').references(() => transfers.id, { onDelete: 'set null' }), // vínculo com transferência
  
  // Conta (ex: Luz, Água, Uber) - OBRIGATÓRIO
  // O nome e tipo virão da conta vinculada
  accountId: uuid('account_id').notNull().references(() => expenseIncomeAccounts.id, { onDelete: 'restrict' }),
  
  // Observação adicional (opcional)
  observation: text('observation'),
  
  // Valores
  expectedAmount: numeric('expected_amount', { precision: 15, scale: 2 }).notNull(),
  actualAmount: numeric('actual_amount', { precision: 15, scale: 2 }),
  
  // Data
  monthYear: text('month_year').notNull(), // formato: 'YYYY-MM'
  paidDate: date('paid_date'),
  
  // Forma de pagamento
  paymentMethod: text('payment_method').notNull(), // 'credit_card', 'debit_card', 'bank_account', 'cash', 'transfer'
  bankAccountId: uuid('bank_account_id').references(() => bankAccounts.id, { onDelete: 'set null' }),
  cardId: uuid('card_id').references(() => cards.id, { onDelete: 'set null' }),
  boxId: uuid('box_id').references(() => bankAccountBoxes.id, { onDelete: 'set null' }), // caixinha afetada
  
  // Parcelas
  installmentNumber: integer('installment_number'),
  totalInstallments: integer('total_installments'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
