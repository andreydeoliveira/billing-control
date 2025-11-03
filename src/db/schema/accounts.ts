import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { financialControls } from './financial-controls';
import { provisionedTransactions } from './transactions';
import { monthlyTransactions } from './monthly-transactions';

// Contas de despesas/receitas (ex: Luz, Água, Internet, Uber, Alimentação, etc)
export const expenseIncomeAccounts = pgTable('expense_income_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  financialControlId: uuid('financial_control_id').notNull().references(() => financialControls.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // Ex: "Luz", "Água", "Uber", "Alimentação"
  description: text('description'), // Descrição adicional
  type: text('type').notNull(), // 'expense' ou 'income'
  color: text('color'), // cor para identificação visual (ex: #FF5733)
  icon: text('icon'), // ícone para identificação visual
  isActive: boolean('is_active').notNull().default(true), // se a conta está ativa
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relações
export const expenseIncomeAccountsRelations = relations(expenseIncomeAccounts, ({ one, many }) => ({
  financialControl: one(financialControls, {
    fields: [expenseIncomeAccounts.financialControlId],
    references: [financialControls.id],
  }),
  provisionedTransactions: many(provisionedTransactions),
  monthlyTransactions: many(monthlyTransactions),
}));

// Manter compatibilidade (deprecated - use expenseIncomeAccounts)
export const accounts = expenseIncomeAccounts;
export const accountsRelations = expenseIncomeAccountsRelations;
export const categories = expenseIncomeAccounts;
export const categoriesRelations = expenseIncomeAccountsRelations;
