import { db } from '../db';
import { subscriptionsTable, usersTable } from '../db/schema';
import { type CreateSubscriptionInput, type Subscription } from '../schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const createSubscription = async (input: CreateSubscriptionInput): Promise<Subscription> => {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Set default limits based on plan
    const defaultLimits = {
      free: { customers: 3, projects: 3 },
      pro: { customers: 50, projects: 100 },
      enterprise: { customers: -1, projects: -1 } // unlimited
    };

    const limits = defaultLimits[input.plan];

    // Insert subscription record
    const result = await db.insert(subscriptionsTable)
      .values({
        id: randomUUID(),
        user_id: input.user_id,
        plan: input.plan,
        status: 'active',
        max_customers: input.max_customers ?? limits.customers,
        max_projects: input.max_projects ?? limits.projects,
        expires_at: input.expires_at ?? null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Subscription creation failed:', error);
    throw error;
  }
};