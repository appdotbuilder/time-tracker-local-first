import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Organization schema
export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
  owner_id: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Organization = z.infer<typeof organizationSchema>;

// Subscription schema
export const subscriptionSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  plan: z.enum(['free', 'pro', 'enterprise']),
  status: z.enum(['active', 'cancelled', 'expired']),
  max_customers: z.number().int(),
  max_projects: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  expires_at: z.coerce.date().nullable()
});

export type Subscription = z.infer<typeof subscriptionSchema>;

// Customer schema
export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  organization_id: z.string(),
  created_by: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Customer = z.infer<typeof customerSchema>;

// Project schema
export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  customer_id: z.string(),
  organization_id: z.string(),
  created_by: z.string(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Project = z.infer<typeof projectSchema>;

// Time Entry schema
export const timeEntrySchema = z.object({
  id: z.string(),
  user_id: z.string(),
  customer_id: z.string().nullable(),
  project_id: z.string().nullable(),
  description: z.string(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date().nullable(),
  duration_minutes: z.number().int().nullable(),
  tags: z.array(z.string()),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type TimeEntry = z.infer<typeof timeEntrySchema>;

// Input schemas for creating entities

export const createUserInputSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  password: z.string().min(8)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createOrganizationInputSchema = z.object({
  name: z.string().min(1),
  owner_id: z.string()
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationInputSchema>;

export const createSubscriptionInputSchema = z.object({
  user_id: z.string(),
  plan: z.enum(['free', 'pro', 'enterprise']),
  max_customers: z.number().int().positive().optional(),
  max_projects: z.number().int().positive().optional(),
  expires_at: z.coerce.date().nullable().optional()
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionInputSchema>;

export const createCustomerInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  organization_id: z.string()
});

export type CreateCustomerInput = z.infer<typeof createCustomerInputSchema>;

export const createProjectInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  customer_id: z.string(),
  organization_id: z.string()
});

export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

export const createTimeEntryInputSchema = z.object({
  customer_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  description: z.string().min(1),
  start_time: z.coerce.date(),
  end_time: z.coerce.date().nullable().optional(),
  tags: z.array(z.string()).optional()
});

export type CreateTimeEntryInput = z.infer<typeof createTimeEntryInputSchema>;

// Update schemas

export const updateUserInputSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  name: z.string().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

export const updateOrganizationInputSchema = z.object({
  id: z.string(),
  name: z.string().optional()
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationInputSchema>;

export const updateSubscriptionInputSchema = z.object({
  id: z.string(),
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  status: z.enum(['active', 'cancelled', 'expired']).optional(),
  max_customers: z.number().int().positive().optional(),
  max_projects: z.number().int().positive().optional(),
  expires_at: z.coerce.date().nullable().optional()
});

export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionInputSchema>;

export const updateCustomerInputSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional()
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerInputSchema>;

export const updateProjectInputSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;

export const updateTimeEntryInputSchema = z.object({
  id: z.string(),
  customer_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  description: z.string().optional(),
  start_time: z.coerce.date().optional(),
  end_time: z.coerce.date().nullable().optional(),
  tags: z.array(z.string()).optional()
});

export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntryInputSchema>;

// Query schemas

export const getTimeEntriesInputSchema = z.object({
  user_id: z.string().optional(),
  customer_id: z.string().optional(),
  project_id: z.string().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  tags: z.array(z.string()).optional()
});

export type GetTimeEntriesInput = z.infer<typeof getTimeEntriesInputSchema>;

export const getCustomersInputSchema = z.object({
  organization_id: z.string()
});

export type GetCustomersInput = z.infer<typeof getCustomersInputSchema>;

export const getProjectsInputSchema = z.object({
  organization_id: z.string(),
  customer_id: z.string().optional()
});

export type GetProjectsInput = z.infer<typeof getProjectsInputSchema>;