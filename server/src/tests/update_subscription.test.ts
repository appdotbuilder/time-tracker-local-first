import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, subscriptionsTable } from '../db/schema';
import { type UpdateSubscriptionInput } from '../schema';
import { updateSubscription } from '../handlers/update_subscription';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User'
};

const testSubscription = {
  id: 'test-subscription-id',
  user_id: testUser.id,
  plan: 'free' as const,
  status: 'active' as const,
  max_customers: 3,
  max_projects: 3,
  expires_at: null
};

describe('updateSubscription', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update subscription plan', async () => {
    // Create prerequisite user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create subscription to update
    await db.insert(subscriptionsTable)
      .values(testSubscription)
      .execute();

    const updateInput: UpdateSubscriptionInput = {
      id: testSubscription.id,
      plan: 'pro'
    };

    const result = await updateSubscription(updateInput);

    expect(result.id).toEqual(testSubscription.id);
    expect(result.plan).toEqual('pro');
    expect(result.status).toEqual('active'); // unchanged
    expect(result.max_customers).toEqual(3); // unchanged
    expect(result.max_projects).toEqual(3); // unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update subscription status', async () => {
    // Create prerequisite user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create subscription to update
    await db.insert(subscriptionsTable)
      .values(testSubscription)
      .execute();

    const updateInput: UpdateSubscriptionInput = {
      id: testSubscription.id,
      status: 'cancelled'
    };

    const result = await updateSubscription(updateInput);

    expect(result.id).toEqual(testSubscription.id);
    expect(result.plan).toEqual('free'); // unchanged
    expect(result.status).toEqual('cancelled');
    expect(result.max_customers).toEqual(3); // unchanged
    expect(result.max_projects).toEqual(3); // unchanged
  });

  it('should update limits', async () => {
    // Create prerequisite user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create subscription to update
    await db.insert(subscriptionsTable)
      .values(testSubscription)
      .execute();

    const updateInput: UpdateSubscriptionInput = {
      id: testSubscription.id,
      max_customers: 10,
      max_projects: 15
    };

    const result = await updateSubscription(updateInput);

    expect(result.id).toEqual(testSubscription.id);
    expect(result.plan).toEqual('free'); // unchanged
    expect(result.status).toEqual('active'); // unchanged
    expect(result.max_customers).toEqual(10);
    expect(result.max_projects).toEqual(15);
  });

  it('should update expires_at', async () => {
    // Create prerequisite user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create subscription to update
    await db.insert(subscriptionsTable)
      .values(testSubscription)
      .execute();

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const updateInput: UpdateSubscriptionInput = {
      id: testSubscription.id,
      expires_at: futureDate
    };

    const result = await updateSubscription(updateInput);

    expect(result.id).toEqual(testSubscription.id);
    expect(result.expires_at).toBeInstanceOf(Date);
    expect(result.expires_at?.getTime()).toEqual(futureDate.getTime());
  });

  it('should set expires_at to null', async () => {
    // Create prerequisite user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create subscription with expires_at set
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    
    const subscriptionWithExpiry = {
      ...testSubscription,
      expires_at: futureDate
    };

    await db.insert(subscriptionsTable)
      .values(subscriptionWithExpiry)
      .execute();

    const updateInput: UpdateSubscriptionInput = {
      id: testSubscription.id,
      expires_at: null
    };

    const result = await updateSubscription(updateInput);

    expect(result.id).toEqual(testSubscription.id);
    expect(result.expires_at).toBeNull();
  });

  it('should update multiple fields at once', async () => {
    // Create prerequisite user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create subscription to update
    await db.insert(subscriptionsTable)
      .values(testSubscription)
      .execute();

    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const updateInput: UpdateSubscriptionInput = {
      id: testSubscription.id,
      plan: 'enterprise',
      status: 'active',
      max_customers: 50,
      max_projects: 100,
      expires_at: futureDate
    };

    const result = await updateSubscription(updateInput);

    expect(result.id).toEqual(testSubscription.id);
    expect(result.plan).toEqual('enterprise');
    expect(result.status).toEqual('active');
    expect(result.max_customers).toEqual(50);
    expect(result.max_projects).toEqual(100);
    expect(result.expires_at).toBeInstanceOf(Date);
    expect(result.expires_at?.getTime()).toEqual(futureDate.getTime());
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save changes to database', async () => {
    // Create prerequisite user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create subscription to update
    await db.insert(subscriptionsTable)
      .values(testSubscription)
      .execute();

    const updateInput: UpdateSubscriptionInput = {
      id: testSubscription.id,
      plan: 'pro',
      status: 'cancelled'
    };

    await updateSubscription(updateInput);

    // Verify changes are saved to database
    const subscriptions = await db.select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.id, testSubscription.id))
      .execute();

    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0].plan).toEqual('pro');
    expect(subscriptions[0].status).toEqual('cancelled');
    expect(subscriptions[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent subscription', async () => {
    const updateInput: UpdateSubscriptionInput = {
      id: 'non-existent-id',
      plan: 'pro'
    };

    await expect(updateSubscription(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should update only provided fields', async () => {
    // Create prerequisite user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create subscription with specific values
    const initialSubscription = {
      ...testSubscription,
      plan: 'pro' as const,
      status: 'active' as const,
      max_customers: 10,
      max_projects: 20
    };

    await db.insert(subscriptionsTable)
      .values(initialSubscription)
      .execute();

    // Update only one field
    const updateInput: UpdateSubscriptionInput = {
      id: testSubscription.id,
      max_customers: 25
    };

    const result = await updateSubscription(updateInput);

    // Only max_customers should change
    expect(result.plan).toEqual('pro'); // unchanged
    expect(result.status).toEqual('active'); // unchanged
    expect(result.max_customers).toEqual(25); // changed
    expect(result.max_projects).toEqual(20); // unchanged
  });
});