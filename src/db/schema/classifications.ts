import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';
import { financialControls } from './financial-controls';

// Classificações para agrupar contas (ex: Moradia, Transporte, Alimentação, Lazer)
export const accountClassifications = pgTable('account_classifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  financialControlId: uuid('financial_control_id').notNull().references(() => financialControls.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'), // cor para visualização
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
