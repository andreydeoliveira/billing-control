import { pgTable, uuid, text, numeric, timestamp, date } from 'drizzle-orm/pg-core';
import { bankAccounts } from './accounts-and-cards';
import { financialControls } from './financial-controls';

// Controle de saldos mensais e rendimentos de contas bancárias
export const bankAccountMonthlyBalances = pgTable('bank_account_monthly_balances', {
  id: uuid('id').defaultRandom().primaryKey(),
  financialControlId: uuid('financial_control_id').notNull().references(() => financialControls.id, { onDelete: 'cascade' }),
  bankAccountId: uuid('bank_account_id').notNull().references(() => bankAccounts.id, { onDelete: 'cascade' }),
  
  monthYear: text('month_year').notNull(), // formato YYYY-MM
  
  // Saldo informado pelo usuário (saldo final do mês no extrato)
  finalBalance: numeric('final_balance', { precision: 15, scale: 2 }).notNull(),
  
  // Rendimento calculado automaticamente
  // = finalBalance - (initialBalance + income - expenses + transfersIn - transfersOut - cardPayments)
  yield: numeric('yield', { precision: 15, scale: 2 }),
  
  // Observações (opcional)
  observation: text('observation'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
