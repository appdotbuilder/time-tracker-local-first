import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organizationsTable, usersTable } from '../db/schema';
import { getOrganization } from '../handlers/get_organization';

describe('getOrganization', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return organization when found', async () => {
    // Create a user first (required for organization owner_id)
    await db.insert(usersTable).values({
      id: 'user-1',
      email: 'owner@test.com',
      name: 'Test Owner'
    }).execute();

    // Create test organization
    await db.insert(organizationsTable).values({
      id: 'org-1',
      name: 'Test Organization',
      owner_id: 'user-1'
    }).execute();

    const result = await getOrganization('org-1');

    expect(result).toBeDefined();
    expect(result!.id).toEqual('org-1');
    expect(result!.name).toEqual('Test Organization');
    expect(result!.owner_id).toEqual('user-1');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when organization not found', async () => {
    const result = await getOrganization('nonexistent-id');
    expect(result).toBeNull();
  });

  it('should return correct organization when multiple exist', async () => {
    // Create a user first
    await db.insert(usersTable).values({
      id: 'user-1',
      email: 'owner@test.com',
      name: 'Test Owner'
    }).execute();

    // Create multiple organizations
    await db.insert(organizationsTable).values([
      {
        id: 'org-1',
        name: 'Organization One',
        owner_id: 'user-1'
      },
      {
        id: 'org-2',
        name: 'Organization Two',
        owner_id: 'user-1'
      }
    ]).execute();

    const result = await getOrganization('org-2');

    expect(result).toBeDefined();
    expect(result!.id).toEqual('org-2');
    expect(result!.name).toEqual('Organization Two');
    expect(result!.owner_id).toEqual('user-1');
  });

  it('should handle database constraints properly', async () => {
    // Create a user first
    await db.insert(usersTable).values({
      id: 'user-1',
      email: 'owner@test.com',
      name: 'Test Owner'
    }).execute();

    // Create organization with all required fields
    await db.insert(organizationsTable).values({
      id: 'org-1',
      name: 'Test Organization',
      owner_id: 'user-1'
    }).execute();

    const result = await getOrganization('org-1');

    expect(result).toBeDefined();
    expect(result!.name).toBeDefined();
    expect(result!.owner_id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });
});