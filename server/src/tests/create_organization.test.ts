import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organizationsTable, usersTable } from '../db/schema';
import { type CreateOrganizationInput } from '../schema';
import { createOrganization } from '../handlers/create_organization';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Test data
const testUserId = nanoid();
const testInput: CreateOrganizationInput = {
  name: 'Test Organization',
  owner_id: testUserId
};

describe('createOrganization', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create test user for each test
    await db.insert(usersTable)
      .values({
        id: testUserId,
        email: 'test@example.com',
        name: 'Test User'
      })
      .execute();
  });

  it('should create an organization', async () => {
    const result = await createOrganization(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Organization');
    expect(result.owner_id).toEqual(testUserId);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect(result.id.length).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save organization to database', async () => {
    const result = await createOrganization(testInput);

    // Query using proper drizzle syntax
    const organizations = await db.select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, result.id))
      .execute();

    expect(organizations).toHaveLength(1);
    expect(organizations[0].name).toEqual('Test Organization');
    expect(organizations[0].owner_id).toEqual(testUserId);
    expect(organizations[0].created_at).toBeInstanceOf(Date);
    expect(organizations[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when owner user does not exist', async () => {
    const invalidInput: CreateOrganizationInput = {
      name: 'Test Organization',
      owner_id: 'non-existent-user-id'
    };

    await expect(createOrganization(invalidInput)).rejects.toThrow(/User with id non-existent-user-id not found/i);
  });

  it('should create organization with different names for same owner', async () => {
    const firstOrg = await createOrganization({
      name: 'First Organization',
      owner_id: testUserId
    });

    const secondOrg = await createOrganization({
      name: 'Second Organization',
      owner_id: testUserId
    });

    expect(firstOrg.id).not.toEqual(secondOrg.id);
    expect(firstOrg.name).toEqual('First Organization');
    expect(secondOrg.name).toEqual('Second Organization');
    expect(firstOrg.owner_id).toEqual(testUserId);
    expect(secondOrg.owner_id).toEqual(testUserId);

    // Verify both organizations exist in database
    const organizations = await db.select()
      .from(organizationsTable)
      .where(eq(organizationsTable.owner_id, testUserId))
      .execute();

    expect(organizations).toHaveLength(2);
  });

  it('should generate unique IDs for multiple organizations', async () => {
    const results = await Promise.all([
      createOrganization({ name: 'Org 1', owner_id: testUserId }),
      createOrganization({ name: 'Org 2', owner_id: testUserId }),
      createOrganization({ name: 'Org 3', owner_id: testUserId })
    ]);

    const ids = results.map(org => org.id);
    const uniqueIds = new Set(ids);
    
    expect(uniqueIds.size).toEqual(3);
    expect(ids.every(id => typeof id === 'string' && id.length > 0)).toBe(true);
  });
});