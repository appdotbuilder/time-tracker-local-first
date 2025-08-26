import { text, pgTable, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['free', 'pro', 'enterprise']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'cancelled', 'expired']);

// Users table
export const usersTable = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Organizations table
export const organizationsTable = pgTable('organizations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  owner_id: text('owner_id').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Subscriptions table
export const subscriptionsTable = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => usersTable.id),
  plan: subscriptionPlanEnum('plan').notNull().default('free'),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  max_customers: integer('max_customers').notNull().default(3),
  max_projects: integer('max_projects').notNull().default(3),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  expires_at: timestamp('expires_at')
});

// Customers table
export const customersTable = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  organization_id: text('organization_id').notNull().references(() => organizationsTable.id),
  created_by: text('created_by').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Projects table
export const projectsTable = pgTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  customer_id: text('customer_id').notNull().references(() => customersTable.id),
  organization_id: text('organization_id').notNull().references(() => organizationsTable.id),
  created_by: text('created_by').notNull().references(() => usersTable.id),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Time entries table
export const timeEntriesTable = pgTable('time_entries', {
  id: text('id').primaryKey(),
  user_id: text('user_id').notNull().references(() => usersTable.id),
  customer_id: text('customer_id').references(() => customersTable.id),
  project_id: text('project_id').references(() => projectsTable.id),
  description: text('description').notNull(),
  start_time: timestamp('start_time').notNull(),
  end_time: timestamp('end_time'),
  duration_minutes: integer('duration_minutes'),
  tags: text('tags').array().notNull().default([]),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many, one }) => ({
  ownedOrganizations: many(organizationsTable),
  subscriptions: many(subscriptionsTable),
  timeEntries: many(timeEntriesTable),
  createdCustomers: many(customersTable),
  createdProjects: many(projectsTable)
}));

export const organizationsRelations = relations(organizationsTable, ({ one, many }) => ({
  owner: one(usersTable, {
    fields: [organizationsTable.owner_id],
    references: [usersTable.id]
  }),
  customers: many(customersTable),
  projects: many(projectsTable)
}));

export const subscriptionsRelations = relations(subscriptionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [subscriptionsTable.user_id],
    references: [usersTable.id]
  })
}));

export const customersRelations = relations(customersTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [customersTable.organization_id],
    references: [organizationsTable.id]
  }),
  createdBy: one(usersTable, {
    fields: [customersTable.created_by],
    references: [usersTable.id]
  }),
  projects: many(projectsTable),
  timeEntries: many(timeEntriesTable)
}));

export const projectsRelations = relations(projectsTable, ({ one, many }) => ({
  customer: one(customersTable, {
    fields: [projectsTable.customer_id],
    references: [customersTable.id]
  }),
  organization: one(organizationsTable, {
    fields: [projectsTable.organization_id],
    references: [organizationsTable.id]
  }),
  createdBy: one(usersTable, {
    fields: [projectsTable.created_by],
    references: [usersTable.id]
  }),
  timeEntries: many(timeEntriesTable)
}));

export const timeEntriesRelations = relations(timeEntriesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [timeEntriesTable.user_id],
    references: [usersTable.id]
  }),
  customer: one(customersTable, {
    fields: [timeEntriesTable.customer_id],
    references: [customersTable.id]
  }),
  project: one(projectsTable, {
    fields: [timeEntriesTable.project_id],
    references: [projectsTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Organization = typeof organizationsTable.$inferSelect;
export type NewOrganization = typeof organizationsTable.$inferInsert;

export type Subscription = typeof subscriptionsTable.$inferSelect;
export type NewSubscription = typeof subscriptionsTable.$inferInsert;

export type Customer = typeof customersTable.$inferSelect;
export type NewCustomer = typeof customersTable.$inferInsert;

export type Project = typeof projectsTable.$inferSelect;
export type NewProject = typeof projectsTable.$inferInsert;

export type TimeEntry = typeof timeEntriesTable.$inferSelect;
export type NewTimeEntry = typeof timeEntriesTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  organizations: organizationsTable,
  subscriptions: subscriptionsTable,
  customers: customersTable,
  projects: projectsTable,
  timeEntries: timeEntriesTable
};