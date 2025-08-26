import { db } from '../db';
import { usersTable, organizationsTable, subscriptionsTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { randomUUID } from 'crypto';

export const createUser = async (input: CreateUserInput): Promise<User> => {
  try {
    // Generate unique IDs
    const userId = randomUUID();
    const organizationId = randomUUID();
    const subscriptionId = randomUUID();

    // Create user record
    const userResult = await db.insert(usersTable)
      .values({
        id: userId,
        email: input.email,
        name: input.name
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create default organization for the user
    await db.insert(organizationsTable)
      .values({
        id: organizationId,
        name: `${input.name}'s Organization`,
        owner_id: userId
      })
      .execute();

    // Create default subscription for the user
    await db.insert(subscriptionsTable)
      .values({
        id: subscriptionId,
        user_id: userId,
        plan: 'free',
        status: 'active',
        max_customers: 3,
        max_projects: 3,
        expires_at: null
      })
      .execute();

    return user;
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
};