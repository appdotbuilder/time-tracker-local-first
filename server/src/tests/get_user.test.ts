import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUser } from '../handlers/get_user';

// Test user data
const testUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User'
};

describe('getUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create a test user in the database
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await getUser('user-123');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('user-123');
    expect(result!.email).toEqual('test@example.com');
    expect(result!.name).toEqual('Test User');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    const result = await getUser('non-existent-user');
    
    expect(result).toBeNull();
  });

  it('should return correct user when multiple users exist', async () => {
    // Create multiple users
    await db.insert(usersTable)
      .values([
        testUser,
        {
          id: 'user-456',
          email: 'other@example.com',
          name: 'Other User'
        }
      ])
      .execute();

    const result = await getUser('user-456');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('user-456');
    expect(result!.email).toEqual('other@example.com');
    expect(result!.name).toEqual('Other User');
  });

  it('should handle empty database', async () => {
    const result = await getUser('any-user-id');
    
    expect(result).toBeNull();
  });
});