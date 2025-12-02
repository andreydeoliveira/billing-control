import { pgTable, text, timestamp, uuid, numeric, boolean } from 'drizzle-orm/pg-core';
import { financialControls } from './financial-controls';

export const bankAccounts = pgTable('bank_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  financialControlId: uuid('financial_control_id').notNull().references(() => financialControls.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // ex: "Conta BTG Andrey"
  bankName: text('bank_name').notNull(), // ex: "BTG"
  initialBalance: numeric('initial_balance').default('0').notNull(),
  isActive: boolean('is_active').default(true).notNull(), // se a conta está ativa
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
  isActive: boolean('is_active').default(true).notNull(), // se o cartão está ativo
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const bankAccountBoxes = pgTable('bank_account_boxes', {
  id: uuid('id').defaultRandom().primaryKey(),
  financialControlId: uuid('financial_control_id').notNull().references(() => financialControls.id, { onDelete: 'cascade' }),
  bankAccountId: uuid('bank_account_id').notNull().references(() => bankAccounts.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // ex: "Reserva Emergência", "Viagem"
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
