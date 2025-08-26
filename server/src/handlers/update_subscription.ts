import { db } from '../db';
import { subscriptionsTable } from '../db/schema';
import { type UpdateSubscriptionInput, type Subscription } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateSubscription(input: UpdateSubscriptionInput): Promise<Subscription> {
  try {
    // Build update values object, only including fields that are provided
    const updateValues: any = {
      updated_at: new Date()
    };

    if (input.plan !== undefined) {
      updateValues.plan = input.plan;
    }

    if (input.status !== undefined) {
      updateValues.status = input.status;
    }

    if (input.max_customers !== undefined) {
      updateValues.max_customers = input.max_customers;
    }

    if (input.max_projects !== undefined) {
      updateValues.max_projects = input.max_projects;
    }

    if (input.expires_at !== undefined) {
      updateValues.expires_at = input.expires_at;
    }

    // Update subscription record
    const result = await db.update(subscriptionsTable)
      .set(updateValues)
      .where(eq(subscriptionsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Subscription with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Subscription update failed:', error);
    throw error;
  }
}