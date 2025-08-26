import { db } from '../db';
import { subscriptionsTable } from '../db/schema';
import { type Subscription } from '../schema';
import { eq } from 'drizzle-orm';

export async function getSubscription(userId: string): Promise<Subscription | null> {
  try {
    // Query for the user's subscription
    const result = await db.select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.user_id, userId))
      .execute();

    // Return null if no subscription found
    if (result.length === 0) {
      return null;
    }

    // Return the subscription data
    const subscription = result[0];
    return subscription;
  } catch (error) {
    console.error('Get subscription failed:', error);
    throw error;
  }
}