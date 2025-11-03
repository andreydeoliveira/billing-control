import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const financialControls = pgTable('financial_controls', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Tabela de relação many-to-many entre usuários e controles financeiros
export const financialControlUsers = pgTable('financial_control_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  financialControlId: uuid('financial_control_id').notNull().references(() => financialControls.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tabela de convites pendentes (para usuários que ainda não se registraram)
export const financialControlInvites = pgTable('financial_control_invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  financialControlId: uuid('financial_control_id').notNull().references(() => financialControls.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  invitedBy: uuid('invited_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relações
export const financialControlsRelations = relations(financialControls, ({ one, many }) => ({
  owner: one(users, {
    fields: [financialControls.ownerId],
    references: [users.id],
  }),
  users: many(financialControlUsers),
}));

export const financialControlUsersRelations = relations(financialControlUsers, ({ one }) => ({
  financialControl: one(financialControls, {
    fields: [financialControlUsers.financialControlId],
    references: [financialControls.id],
  }),
  user: one(users, {
    fields: [financialControlUsers.userId],
    references: [users.id],
  }),
}));

export const financialControlInvitesRelations = relations(financialControlInvites, ({ one }) => ({
  financialControl: one(financialControls, {
    fields: [financialControlInvites.financialControlId],
    references: [financialControls.id],
  }),
  invitedByUser: one(users, {
    fields: [financialControlInvites.invitedBy],
    references: [users.id],
  }),
}));
