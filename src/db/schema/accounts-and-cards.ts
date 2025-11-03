import { pgTable, text, timestamp, uuid, numeric, boolean } from 'drizzle-orm/pg-core';
import { financialControls } from './financial-controls';

export const bankAccounts = pgTable('bank_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  financialControlId: uuid('financial_control_id').notNull().references(() => financialControls.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // ex: "Conta BTG Andrey"
  bankName: text('bank_name').notNull(), // ex: "BTG"
  initialBalance: numeric('initial_balance', { precision: 15, scale: 2 }), // opcional
  trackBalance: boolean('track_balance').default(false).notNull(), // se deve aparecer no controle de saldo
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const cards = pgTable('cards', {
  id: uuid('id').defaultRandom().primaryKey(),
  financialControlId: uuid('financial_control_id').notNull().references(() => financialControls.id, { onDelete: 'cascade' }),
  bankAccountId: uuid('bank_account_id').references(() => bankAccounts.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  closingDay: numeric('closing_day'), // dia de fechamento da fatura
  dueDay: numeric('due_day'), // dia de vencimento da fatura
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
