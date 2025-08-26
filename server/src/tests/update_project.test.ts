import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, customersTable, projectsTable } from '../db/schema';
import { type UpdateProjectInput } from '../schema';
import { updateProject } from '../handlers/update_project';
import { eq } from 'drizzle-orm';

describe('updateProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test setup data
  let userId: string;
  let orgId: string;
  let customerId: string;
  let projectId: string;

  const setupTestData = async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        id: 'test-user-1',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        id: 'test-org-1',
        name: 'Test Organization',
        owner_id: userId
      })
      .returning()
      .execute();
    orgId = orgResult[0].id;

    // Create customer
    const customerResult = await db.insert(customersTable)
      .values({
        id: 'test-customer-1',
        name: 'Test Customer',
        email: 'customer@example.com',
        organization_id: orgId,
        created_by: userId
      })
      .returning()
      .execute();
    customerId = customerResult[0].id;

    // Create project
    const projectResult = await db.insert(projectsTable)
      .values({
        id: 'test-project-1',
        name: 'Original Project',
        description: 'Original description',
        customer_id: customerId,
        organization_id: orgId,
        created_by: userId,
        is_active: true
      })
      .returning()
      .execute();
    projectId = projectResult[0].id;
  };

  it('should update project name', async () => {
    await setupTestData();

    const updateInput: UpdateProjectInput = {
      id: projectId,
      name: 'Updated Project Name'
    };

    const result = await updateProject(updateInput);

    expect(result.id).toEqual(projectId);
    expect(result.name).toEqual('Updated Project Name');
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.is_active).toBe(true); // Unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update project description', async () => {
    await setupTestData();

    const updateInput: UpdateProjectInput = {
      id: projectId,
      description: 'Updated description'
    };

    const result = await updateProject(updateInput);

    expect(result.id).toEqual(projectId);
    expect(result.name).toEqual('Original Project'); // Unchanged
    expect(result.description).toEqual('Updated description');
    expect(result.is_active).toBe(true); // Unchanged
  });

  it('should update project active status', async () => {
    await setupTestData();

    const updateInput: UpdateProjectInput = {
      id: projectId,
      is_active: false
    };

    const result = await updateProject(updateInput);

    expect(result.id).toEqual(projectId);
    expect(result.name).toEqual('Original Project'); // Unchanged
    expect(result.description).toEqual('Original description'); // Unchanged
    expect(result.is_active).toBe(false);
  });

  it('should update multiple fields at once', async () => {
    await setupTestData();

    const updateInput: UpdateProjectInput = {
      id: projectId,
      name: 'Multi-Updated Project',
      description: 'Multi-updated description',
      is_active: false
    };

    const result = await updateProject(updateInput);

    expect(result.id).toEqual(projectId);
    expect(result.name).toEqual('Multi-Updated Project');
    expect(result.description).toEqual('Multi-updated description');
    expect(result.is_active).toBe(false);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set description to null', async () => {
    await setupTestData();

    const updateInput: UpdateProjectInput = {
      id: projectId,
      description: null
    };

    const result = await updateProject(updateInput);

    expect(result.id).toEqual(projectId);
    expect(result.description).toBeNull();
    expect(result.name).toEqual('Original Project'); // Unchanged
  });

  it('should save changes to database', async () => {
    await setupTestData();

    const updateInput: UpdateProjectInput = {
      id: projectId,
      name: 'Database Updated Project',
      is_active: false
    };

    await updateProject(updateInput);

    // Verify changes were persisted
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .execute();

    expect(projects).toHaveLength(1);
    expect(projects[0].name).toEqual('Database Updated Project');
    expect(projects[0].is_active).toBe(false);
    expect(projects[0].updated_at).toBeInstanceOf(Date);
  });

  it('should always update the updated_at timestamp', async () => {
    await setupTestData();

    // Get original timestamp
    const originalProject = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .execute();

    const originalUpdatedAt = originalProject[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateProjectInput = {
      id: projectId,
      name: 'Timestamp Test'
    };

    const result = await updateProject(updateInput);

    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should throw error when project not found', async () => {
    const updateInput: UpdateProjectInput = {
      id: 'non-existent-project',
      name: 'Should Fail'
    };

    await expect(updateProject(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle empty update gracefully', async () => {
    await setupTestData();

    const updateInput: UpdateProjectInput = {
      id: projectId
    };

    const result = await updateProject(updateInput);

    expect(result.id).toEqual(projectId);
    expect(result.name).toEqual('Original Project');
    expect(result.description).toEqual('Original description');
    expect(result.is_active).toBe(true);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});