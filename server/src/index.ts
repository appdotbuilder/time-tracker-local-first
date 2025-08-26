import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createUserInputSchema,
  updateUserInputSchema,
  createOrganizationInputSchema,
  updateOrganizationInputSchema,
  createSubscriptionInputSchema,
  updateSubscriptionInputSchema,
  createCustomerInputSchema,
  updateCustomerInputSchema,
  createProjectInputSchema,
  updateProjectInputSchema,
  createTimeEntryInputSchema,
  updateTimeEntryInputSchema,
  getTimeEntriesInputSchema,
  getCustomersInputSchema,
  getProjectsInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { getUser } from './handlers/get_user';
import { updateUser } from './handlers/update_user';
import { createOrganization } from './handlers/create_organization';
import { getOrganization } from './handlers/get_organization';
import { updateOrganization } from './handlers/update_organization';
import { createSubscription } from './handlers/create_subscription';
import { getSubscription } from './handlers/get_subscription';
import { updateSubscription } from './handlers/update_subscription';
import { createCustomer } from './handlers/create_customer';
import { getCustomers } from './handlers/get_customers';
import { getCustomer } from './handlers/get_customer';
import { updateCustomer } from './handlers/update_customer';
import { deleteCustomer } from './handlers/delete_customer';
import { createProject } from './handlers/create_project';
import { getProjects } from './handlers/get_projects';
import { getProject } from './handlers/get_project';
import { updateProject } from './handlers/update_project';
import { deleteProject } from './handlers/delete_project';
import { createTimeEntry } from './handlers/create_time_entry';
import { getTimeEntries } from './handlers/get_time_entries';
import { getTimeEntry } from './handlers/get_time_entry';
import { updateTimeEntry } from './handlers/update_time_entry';
import { deleteTimeEntry } from './handlers/delete_time_entry';
import { getDashboardStats } from './handlers/get_dashboard_stats';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUser: publicProcedure
    .input(z.string())
    .query(({ input }) => getUser(input)),
  
  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Organization routes
  createOrganization: publicProcedure
    .input(createOrganizationInputSchema)
    .mutation(({ input }) => createOrganization(input)),
  
  getOrganization: publicProcedure
    .input(z.string())
    .query(({ input }) => getOrganization(input)),
  
  updateOrganization: publicProcedure
    .input(updateOrganizationInputSchema)
    .mutation(({ input }) => updateOrganization(input)),

  // Subscription routes
  createSubscription: publicProcedure
    .input(createSubscriptionInputSchema)
    .mutation(({ input }) => createSubscription(input)),
  
  getSubscription: publicProcedure
    .input(z.string())
    .query(({ input }) => getSubscription(input)),
  
  updateSubscription: publicProcedure
    .input(updateSubscriptionInputSchema)
    .mutation(({ input }) => updateSubscription(input)),

  // Customer routes
  createCustomer: publicProcedure
    .input(createCustomerInputSchema.extend({ created_by: z.string() }))
    .mutation(({ input }) => {
      const { created_by, ...customerInput } = input;
      return createCustomer(customerInput, created_by);
    }),
  
  getCustomers: publicProcedure
    .input(getCustomersInputSchema)
    .query(({ input }) => getCustomers(input)),
  
  getCustomer: publicProcedure
    .input(z.string())
    .query(({ input }) => getCustomer(input)),
  
  updateCustomer: publicProcedure
    .input(updateCustomerInputSchema)
    .mutation(({ input }) => updateCustomer(input)),
  
  deleteCustomer: publicProcedure
    .input(z.string())
    .mutation(({ input }) => deleteCustomer(input)),

  // Project routes
  createProject: publicProcedure
    .input(createProjectInputSchema.extend({ created_by: z.string() }))
    .mutation(({ input }) => {
      const { created_by, ...projectInput } = input;
      return createProject(projectInput, created_by);
    }),
  
  getProjects: publicProcedure
    .input(getProjectsInputSchema)
    .query(({ input }) => getProjects(input)),
  
  getProject: publicProcedure
    .input(z.string())
    .query(({ input }) => getProject(input)),
  
  updateProject: publicProcedure
    .input(updateProjectInputSchema)
    .mutation(({ input }) => updateProject(input)),
  
  deleteProject: publicProcedure
    .input(z.string())
    .mutation(({ input }) => deleteProject(input)),

  // Time Entry routes
  createTimeEntry: publicProcedure
    .input(createTimeEntryInputSchema.extend({ user_id: z.string() }))
    .mutation(({ input }) => {
      const { user_id, ...timeEntryInput } = input;
      return createTimeEntry(timeEntryInput, user_id);
    }),
  
  getTimeEntries: publicProcedure
    .input(getTimeEntriesInputSchema)
    .query(({ input }) => getTimeEntries(input)),
  
  getTimeEntry: publicProcedure
    .input(z.string())
    .query(({ input }) => getTimeEntry(input)),
  
  updateTimeEntry: publicProcedure
    .input(updateTimeEntryInputSchema)
    .mutation(({ input }) => updateTimeEntry(input)),
  
  deleteTimeEntry: publicProcedure
    .input(z.string())
    .mutation(({ input }) => deleteTimeEntry(input)),

  // Dashboard routes
  getDashboardStats: publicProcedure
    .input(z.object({
      user_id: z.string(),
      organization_id: z.string()
    }))
    .query(({ input }) => getDashboardStats(input.user_id, input.organization_id)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();