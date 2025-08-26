import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { subscriptionsTable, usersTable } from '../db/schema';
import { type CreateSubscriptionInput } from '../schema';
import { createSubscription } from '../handlers/create_subscription';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Test user data
const testUser = {
  id: randomUUID(),
  email: 'test@example.com',
  name: 'Test User'
};

// Test input for free plan
const freeSubscriptionInput: CreateSubscriptionInput = {
  user_id: testUser.id,
  plan: 'free'
};

// Test input for pro plan
const proSubscriptionInput: CreateSubscriptionInput = {
  user_id: testUser.id,
  plan: 'pro'
};

// Test input for enterprise plan with custom limits
const enterpriseSubscriptionInput: CreateSubscriptionInput = {
  user_id: testUser.id,
  plan: 'enterprise',
  max_customers: 200,
  max_projects: 500,
  expires_at: new Date('2025-12-31')
};

describe('createSubscription', () => {
  beforeEach(async () => {
    await createDB();
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();
  });
  
  afterEach(resetDB);

  it('should create a free subscription with default limits', async () => {
    const result = await createSubscription(freeSubscriptionInput);

    // Basic field validation
    expect(result.user_id).toEqual(testUser.id);
    expect(result.plan).toEqual('free');
    expect(result.status).toEqual('active');
    expect(result.max_customers).toEqual(3);
    expect(result.max_projects).toEqual(3);
    expect(result.expires_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a pro subscription with default limits', async () => {
    const result = await createSubscription(proSubscriptionInput);

    expect(result.user_id).toEqual(testUser.id);
    expect(result.plan).toEqual('pro');
    expect(result.status).toEqual('active');
    expect(result.max_customers).toEqual(50);
    expect(result.max_projects).toEqual(100);
    expect(result.expires_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an enterprise subscription with unlimited defaults', async () => {
    const simpleEnterpriseInput: CreateSubscriptionInput = {
      user_id: testUser.id,
      plan: 'enterprise'
    };

    const result = await createSubscription(simpleEnterpriseInput);

    expect(result.user_id).toEqual(testUser.id);
    expect(result.plan).toEqual('enterprise');
    expect(result.status).toEqual('active');
    expect(result.max_customers).toEqual(-1); // unlimited
    expect(result.max_projects).toEqual(-1); // unlimited
    expect(result.expires_at).toBeNull();
  });

  it('should create subscription with custom limits and expiration', async () => {
    const result = await createSubscription(enterpriseSubscriptionInput);

    expect(result.user_id).toEqual(testUser.id);
    expect(result.plan).toEqual('enterprise');
    expect(result.status).toEqual('active');
    expect(result.max_customers).toEqual(200);
    expect(result.max_projects).toEqual(500);
    expect(result.expires_at).toEqual(new Date('2025-12-31'));
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save subscription to database', async () => {
    const result = await createSubscription(freeSubscriptionInput);

    // Query database to verify subscription was saved
    const subscriptions = await db.select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.id, result.id))
      .execute();

    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0].user_id).toEqual(testUser.id);
    expect(subscriptions[0].plan).toEqual('free');
    expect(subscriptions[0].status).toEqual('active');
    expect(subscriptions[0].max_customers).toEqual(3);
    expect(subscriptions[0].max_projects).toEqual(3);
    expect(subscriptions[0].created_at).toBeInstanceOf(Date);
    expect(subscriptions[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const invalidInput: CreateSubscriptionInput = {
      user_id: 'non-existent-user-id',
      plan: 'free'
    };

    await expect(createSubscription(invalidInput)).rejects.toThrow(/User not found/i);
  });

  it('should override default limits when provided', async () => {
    const customFreeInput: CreateSubscriptionInput = {
      user_id: testUser.id,
      plan: 'free',
      max_customers: 10,
      max_projects: 20
    };

    const result = await createSubscription(customFreeInput);

    expect(result.plan).toEqual('free');
    expect(result.max_customers).toEqual(10);
    expect(result.max_projects).toEqual(20);
  });

  it('should handle expiration date correctly', async () => {
    const expirationDate = new Date('2024-12-31T23:59:59Z');
    const inputWithExpiration: CreateSubscriptionInput = {
      user_id: testUser.id,
      plan: 'pro',
      expires_at: expirationDate
    };

    const result = await createSubscription(inputWithExpiration);

    expect(result.expires_at).toEqual(expirationDate);

    // Verify in database
    const subscriptions = await db.select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.id, result.id))
      .execute();

    expect(subscriptions[0].expires_at).toEqual(expirationDate);
  });
});