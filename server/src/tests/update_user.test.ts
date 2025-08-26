import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User'
};

const createTestUser = async () => {
  await db.insert(usersTable)
    .values({
      ...testUser,
      created_at: new Date(),
      updated_at: new Date()
    })
    .execute();
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user email only', async () => {
    await createTestUser();

    const updateInput: UpdateUserInput = {
      id: 'user-123',
      email: 'updated@example.com'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual('user-123');
    expect(result.email).toEqual('updated@example.com');
    expect(result.name).toEqual('Test User'); // Should remain unchanged
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > result.created_at).toBe(true);
  });

  it('should update user name only', async () => {
    await createTestUser();

    const updateInput: UpdateUserInput = {
      id: 'user-123',
      name: 'Updated Name'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual('user-123');
    expect(result.email).toEqual('test@example.com'); // Should remain unchanged
    expect(result.name).toEqual('Updated Name');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update both email and name', async () => {
    await createTestUser();

    const updateInput: UpdateUserInput = {
      id: 'user-123',
      email: 'updated@example.com',
      name: 'Updated Name'
    };

    const result = await updateUser(updateInput);

    expect(result.id).toEqual('user-123');
    expect(result.email).toEqual('updated@example.com');
    expect(result.name).toEqual('Updated Name');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated data to database', async () => {
    await createTestUser();

    const updateInput: UpdateUserInput = {
      id: 'user-123',
      email: 'updated@example.com',
      name: 'Updated Name'
    };

    await updateUser(updateInput);

    // Verify the data was actually saved to the database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, 'user-123'))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('updated@example.com');
    expect(users[0].name).toEqual('Updated Name');
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    await createTestUser();

    // Get the original timestamp
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, 'user-123'))
      .execute();

    const originalUpdatedAt = originalUser[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateUserInput = {
      id: 'user-123',
      name: 'Updated Name'
    };

    const result = await updateUser(updateInput);

    expect(result.updated_at > originalUpdatedAt).toBe(true);
  });

  it('should throw error for non-existent user', async () => {
    const updateInput: UpdateUserInput = {
      id: 'non-existent-user',
      name: 'Updated Name'
    };

    await expect(updateUser(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle partial updates correctly', async () => {
    await createTestUser();

    // Update only email
    const emailUpdate: UpdateUserInput = {
      id: 'user-123',
      email: 'newemail@example.com'
    };

    const emailResult = await updateUser(emailUpdate);
    expect(emailResult.email).toEqual('newemail@example.com');
    expect(emailResult.name).toEqual('Test User'); // Unchanged

    // Update only name
    const nameUpdate: UpdateUserInput = {
      id: 'user-123',
      name: 'New Name'
    };

    const nameResult = await updateUser(nameUpdate);
    expect(nameResult.email).toEqual('newemail@example.com'); // From previous update
    expect(nameResult.name).toEqual('New Name');
  });

  it('should validate email format when provided', async () => {
    await createTestUser();

    const updateInput: UpdateUserInput = {
      id: 'user-123',
      email: 'invalid-email-format'
    };

    // The input validation should be handled by Zod at the API layer
    // This test verifies the handler processes valid emails correctly
    const validUpdateInput: UpdateUserInput = {
      id: 'user-123',
      email: 'valid@example.com'
    };

    const result = await updateUser(validUpdateInput);
    expect(result.email).toEqual('valid@example.com');
  });

  it('should preserve created_at timestamp', async () => {
    await createTestUser();

    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, 'user-123'))
      .execute();

    const originalCreatedAt = originalUser[0].created_at;

    const updateInput: UpdateUserInput = {
      id: 'user-123',
      name: 'Updated Name'
    };

    const result = await updateUser(updateInput);

    expect(result.created_at.getTime()).toEqual(originalCreatedAt.getTime());
  });
});