import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organizationsTable, usersTable } from '../db/schema';
import { type UpdateOrganizationInput } from '../schema';
import { updateOrganization } from '../handlers/update_organization';
import { eq } from 'drizzle-orm';

describe('updateOrganization', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create prerequisite user data
  const createTestUser = async () => {
    const userData = {
      id: 'test-user-1',
      email: 'owner@test.com',
      name: 'Test Owner',
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.insert(usersTable).values(userData).execute();
    return userData;
  };

  // Create test organization
  const createTestOrganization = async (userId: string) => {
    const orgData = {
      id: 'test-org-1',
      name: 'Original Organization',
      owner_id: userId,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.insert(organizationsTable).values(orgData).execute();
    return orgData;
  };

  it('should update organization name', async () => {
    const user = await createTestUser();
    const originalOrg = await createTestOrganization(user.id);

    const updateInput: UpdateOrganizationInput = {
      id: originalOrg.id,
      name: 'Updated Organization Name'
    };

    const result = await updateOrganization(updateInput);

    // Verify returned data
    expect(result.id).toEqual(originalOrg.id);
    expect(result.name).toEqual('Updated Organization Name');
    expect(result.owner_id).toEqual(user.id);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalOrg.updated_at.getTime());
  });

  it('should update organization in database', async () => {
    const user = await createTestUser();
    const originalOrg = await createTestOrganization(user.id);

    const updateInput: UpdateOrganizationInput = {
      id: originalOrg.id,
      name: 'Updated Organization Name'
    };

    await updateOrganization(updateInput);

    // Query database to verify changes
    const organizations = await db.select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, originalOrg.id))
      .execute();

    expect(organizations).toHaveLength(1);
    const updatedOrg = organizations[0];
    expect(updatedOrg.name).toEqual('Updated Organization Name');
    expect(updatedOrg.owner_id).toEqual(user.id);
    expect(updatedOrg.updated_at.getTime()).toBeGreaterThan(originalOrg.updated_at.getTime());
  });

  it('should handle partial updates without changing other fields', async () => {
    const user = await createTestUser();
    const originalOrg = await createTestOrganization(user.id);

    // Update without providing name (only id provided)
    const updateInput: UpdateOrganizationInput = {
      id: originalOrg.id
    };

    const result = await updateOrganization(updateInput);

    // Name should remain unchanged, only updated_at should change
    expect(result.name).toEqual(originalOrg.name);
    expect(result.owner_id).toEqual(originalOrg.owner_id);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalOrg.updated_at.getTime());
  });

  it('should throw error when organization does not exist', async () => {
    const updateInput: UpdateOrganizationInput = {
      id: 'non-existent-org',
      name: 'New Name'
    };

    expect(updateOrganization(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should maintain organization ownership after update', async () => {
    const user = await createTestUser();
    const originalOrg = await createTestOrganization(user.id);

    const updateInput: UpdateOrganizationInput = {
      id: originalOrg.id,
      name: 'New Organization Name'
    };

    const result = await updateOrganization(updateInput);

    // Verify ownership is preserved
    expect(result.owner_id).toEqual(user.id);
    expect(result.created_at).toEqual(originalOrg.created_at);
  });

  it('should handle empty string name updates', async () => {
    const user = await createTestUser();
    const originalOrg = await createTestOrganization(user.id);

    const updateInput: UpdateOrganizationInput = {
      id: originalOrg.id,
      name: ''
    };

    const result = await updateOrganization(updateInput);

    expect(result.name).toEqual('');
    expect(result.id).toEqual(originalOrg.id);
  });
});