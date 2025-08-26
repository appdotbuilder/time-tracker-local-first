import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, customersTable, projectsTable } from '../db/schema';
import { getProject } from '../handlers/get_project';

describe('getProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a project when found', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    const organization = await db.insert(organizationsTable)
      .values({
        id: 'org-1',
        name: 'Test Organization',
        owner_id: user[0].id
      })
      .returning()
      .execute();

    const customer = await db.insert(customersTable)
      .values({
        id: 'customer-1',
        name: 'Test Customer',
        organization_id: organization[0].id,
        created_by: user[0].id
      })
      .returning()
      .execute();

    // Create test project
    const testProject = await db.insert(projectsTable)
      .values({
        id: 'project-1',
        name: 'Test Project',
        description: 'A test project description',
        customer_id: customer[0].id,
        organization_id: organization[0].id,
        created_by: user[0].id,
        is_active: true
      })
      .returning()
      .execute();

    const result = await getProject('project-1');

    expect(result).not.toBeNull();
    expect(result?.id).toEqual('project-1');
    expect(result?.name).toEqual('Test Project');
    expect(result?.description).toEqual('A test project description');
    expect(result?.customer_id).toEqual('customer-1');
    expect(result?.organization_id).toEqual('org-1');
    expect(result?.created_by).toEqual('user-1');
    expect(result?.is_active).toBe(true);
    expect(result?.created_at).toBeInstanceOf(Date);
    expect(result?.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when project is not found', async () => {
    const result = await getProject('non-existent-project');
    
    expect(result).toBeNull();
  });

  it('should handle projects with null description', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        id: 'user-2',
        email: 'test2@example.com',
        name: 'Test User 2'
      })
      .returning()
      .execute();

    const organization = await db.insert(organizationsTable)
      .values({
        id: 'org-2',
        name: 'Test Organization 2',
        owner_id: user[0].id
      })
      .returning()
      .execute();

    const customer = await db.insert(customersTable)
      .values({
        id: 'customer-2',
        name: 'Test Customer 2',
        organization_id: organization[0].id,
        created_by: user[0].id
      })
      .returning()
      .execute();

    // Create project with null description
    const testProject = await db.insert(projectsTable)
      .values({
        id: 'project-2',
        name: 'Project Without Description',
        description: null,
        customer_id: customer[0].id,
        organization_id: organization[0].id,
        created_by: user[0].id,
        is_active: false
      })
      .returning()
      .execute();

    const result = await getProject('project-2');

    expect(result).not.toBeNull();
    expect(result?.id).toEqual('project-2');
    expect(result?.name).toEqual('Project Without Description');
    expect(result?.description).toBeNull();
    expect(result?.is_active).toBe(false);
  });

  it('should return the correct project when multiple projects exist', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        id: 'user-3',
        email: 'test3@example.com',
        name: 'Test User 3'
      })
      .returning()
      .execute();

    const organization = await db.insert(organizationsTable)
      .values({
        id: 'org-3',
        name: 'Test Organization 3',
        owner_id: user[0].id
      })
      .returning()
      .execute();

    const customer = await db.insert(customersTable)
      .values({
        id: 'customer-3',
        name: 'Test Customer 3',
        organization_id: organization[0].id,
        created_by: user[0].id
      })
      .returning()
      .execute();

    // Create multiple projects
    await db.insert(projectsTable)
      .values([
        {
          id: 'project-3a',
          name: 'First Project',
          customer_id: customer[0].id,
          organization_id: organization[0].id,
          created_by: user[0].id
        },
        {
          id: 'project-3b',
          name: 'Second Project',
          customer_id: customer[0].id,
          organization_id: organization[0].id,
          created_by: user[0].id
        },
        {
          id: 'project-3c',
          name: 'Third Project',
          customer_id: customer[0].id,
          organization_id: organization[0].id,
          created_by: user[0].id
        }
      ])
      .execute();

    const result = await getProject('project-3b');

    expect(result).not.toBeNull();
    expect(result?.id).toEqual('project-3b');
    expect(result?.name).toEqual('Second Project');
  });
});