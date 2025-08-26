import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, subscriptionsTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateUserInput = {
  email: 'test@example.com',
  name: 'Test User',
  password: 'securePassword123'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with correct fields', async () => {
    const result = await createUser(testInput);

    // Verify user fields
    expect(result.email).toEqual('test@example.com');
    expect(result.name).toEqual('Test User');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInput);

    // Query user from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].name).toEqual('Test User');
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create default organization for the user', async () => {
    const result = await createUser(testInput);

    // Query organization from database
    const organizations = await db.select()
      .from(organizationsTable)
      .where(eq(organizationsTable.owner_id, result.id))
      .execute();

    expect(organizations).toHaveLength(1);
    expect(organizations[0].name).toEqual("Test User's Organization");
    expect(organizations[0].owner_id).toEqual(result.id);
    expect(organizations[0].created_at).toBeInstanceOf(Date);
  });

  it('should create default subscription for the user', async () => {
    const result = await createUser(testInput);

    // Query subscription from database
    const subscriptions = await db.select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.user_id, result.id))
      .execute();

    expect(subscriptions).toHaveLength(1);
    expect(subscriptions[0].user_id).toEqual(result.id);
    expect(subscriptions[0].plan).toEqual('free');
    expect(subscriptions[0].status).toEqual('active');
    expect(subscriptions[0].max_customers).toEqual(3);
    expect(subscriptions[0].max_projects).toEqual(3);
    expect(subscriptions[0].expires_at).toBeNull();
    expect(subscriptions[0].created_at).toBeInstanceOf(Date);
  });

  it('should enforce unique email constraint', async () => {
    // Create first user
    await createUser(testInput);

    // Attempt to create second user with same email
    await expect(createUser(testInput)).rejects.toThrow(/duplicate key value violates unique constraint|UNIQUE constraint failed/i);
  });

  it('should create multiple users with different emails', async () => {
    const user1Input: CreateUserInput = {
      email: 'user1@example.com',
      name: 'User One',
      password: 'password123'
    };

    const user2Input: CreateUserInput = {
      email: 'user2@example.com',
      name: 'User Two',
      password: 'password456'
    };

    const user1 = await createUser(user1Input);
    const user2 = await createUser(user2Input);

    expect(user1.email).toEqual('user1@example.com');
    expect(user2.email).toEqual('user2@example.com');
    expect(user1.id).not.toEqual(user2.id);

    // Verify both users exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
  });

  it('should create unique organizations for each user', async () => {
    const user1Input: CreateUserInput = {
      email: 'user1@example.com',
      name: 'Alice',
      password: 'password123'
    };

    const user2Input: CreateUserInput = {
      email: 'user2@example.com',
      name: 'Bob',
      password: 'password456'
    };

    const user1 = await createUser(user1Input);
    const user2 = await createUser(user2Input);

    // Query organizations
    const organizations = await db.select().from(organizationsTable).execute();
    expect(organizations).toHaveLength(2);

    const user1Org = organizations.find(org => org.owner_id === user1.id);
    const user2Org = organizations.find(org => org.owner_id === user2.id);

    expect(user1Org?.name).toEqual("Alice's Organization");
    expect(user2Org?.name).toEqual("Bob's Organization");
  });

  it('should create unique subscriptions for each user', async () => {
    const user1Input: CreateUserInput = {
      email: 'user1@example.com',
      name: 'User One',
      password: 'password123'
    };

    const user2Input: CreateUserInput = {
      email: 'user2@example.com',
      name: 'User Two',
      password: 'password456'
    };

    const user1 = await createUser(user1Input);
    const user2 = await createUser(user2Input);

    // Query subscriptions
    const subscriptions = await db.select().from(subscriptionsTable).execute();
    expect(subscriptions).toHaveLength(2);

    const user1Sub = subscriptions.find(sub => sub.user_id === user1.id);
    const user2Sub = subscriptions.find(sub => sub.user_id === user2.id);

    expect(user1Sub).toBeDefined();
    expect(user2Sub).toBeDefined();
    expect(user1Sub?.plan).toEqual('free');
    expect(user2Sub?.plan).toEqual('free');
  });
});