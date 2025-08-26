import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, subscriptionsTable } from '../db/schema';
import { getSubscription } from '../handlers/get_subscription';

describe('getSubscription', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user subscription', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User'
    }).execute();

    // Create test subscription
    await db.insert(subscriptionsTable).values({
      id: 'sub-1',
      user_id: 'user-1',
      plan: 'pro',
      status: 'active',
      max_customers: 10,
      max_projects: 20,
      expires_at: new Date('2024-12-31')
    }).execute();

    const result = await getSubscription('user-1');

    expect(result).toBeDefined();
    expect(result!.id).toEqual('sub-1');
    expect(result!.user_id).toEqual('user-1');
    expect(result!.plan).toEqual('pro');
    expect(result!.status).toEqual('active');
    expect(result!.max_customers).toEqual(10);
    expect(result!.max_projects).toEqual(20);
    expect(result!.expires_at).toBeInstanceOf(Date);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user has no subscription', async () => {
    // Create test user without subscription
    await db.insert(usersTable).values({
      id: 'user-2',
      email: 'test2@example.com',
      name: 'Test User 2'
    }).execute();

    const result = await getSubscription('user-2');

    expect(result).toBeNull();
  });

  it('should return null for non-existent user', async () => {
    const result = await getSubscription('non-existent-user');

    expect(result).toBeNull();
  });

  it('should return subscription with default values', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: 'user-3',
      email: 'test3@example.com',
      name: 'Test User 3'
    }).execute();

    // Create subscription with default values (minimal required fields)
    await db.insert(subscriptionsTable).values({
      id: 'sub-3',
      user_id: 'user-3'
      // plan, status, max_customers, max_projects will use defaults
    }).execute();

    const result = await getSubscription('user-3');

    expect(result).toBeDefined();
    expect(result!.id).toEqual('sub-3');
    expect(result!.user_id).toEqual('user-3');
    expect(result!.plan).toEqual('free'); // default value
    expect(result!.status).toEqual('active'); // default value
    expect(result!.max_customers).toEqual(3); // default value
    expect(result!.max_projects).toEqual(3); // default value
    expect(result!.expires_at).toBeNull(); // no expiration set
  });

  it('should return subscription with null expires_at', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: 'user-4',
      email: 'test4@example.com',
      name: 'Test User 4'
    }).execute();

    // Create enterprise subscription without expiration
    await db.insert(subscriptionsTable).values({
      id: 'sub-4',
      user_id: 'user-4',
      plan: 'enterprise',
      status: 'active',
      max_customers: 100,
      max_projects: 50,
      expires_at: null
    }).execute();

    const result = await getSubscription('user-4');

    expect(result).toBeDefined();
    expect(result!.plan).toEqual('enterprise');
    expect(result!.expires_at).toBeNull();
    expect(result!.max_customers).toEqual(100);
    expect(result!.max_projects).toEqual(50);
  });
});