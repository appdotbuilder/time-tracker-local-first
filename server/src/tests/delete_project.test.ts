import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, customersTable, projectsTable, timeEntriesTable } from '../db/schema';
import { deleteProject } from '../handlers/delete_project';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User'
};

const testOrganization = {
  id: 'org-1',
  name: 'Test Organization',
  owner_id: 'user-1'
};

const testCustomer = {
  id: 'customer-1',
  name: 'Test Customer',
  email: 'customer@example.com',
  organization_id: 'org-1',
  created_by: 'user-1'
};

const testProject = {
  id: 'project-1',
  name: 'Test Project',
  description: 'A project for testing',
  customer_id: 'customer-1',
  organization_id: 'org-1',
  created_by: 'user-1',
  is_active: true
};

const testTimeEntry = {
  id: 'time-1',
  user_id: 'user-1',
  customer_id: 'customer-1',
  project_id: 'project-1',
  description: 'Test time entry',
  start_time: new Date('2023-01-01T10:00:00Z'),
  end_time: new Date('2023-01-01T11:00:00Z'),
  duration_minutes: 60,
  tags: ['testing']
};

describe('deleteProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a project successfully', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(organizationsTable).values(testOrganization).execute();
    await db.insert(customersTable).values(testCustomer).execute();
    await db.insert(projectsTable).values(testProject).execute();

    const result = await deleteProject('project-1');

    expect(result).toBe(true);

    // Verify project is deleted
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, 'project-1'))
      .execute();

    expect(projects).toHaveLength(0);
  });

  it('should cascade delete related time entries', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(organizationsTable).values(testOrganization).execute();
    await db.insert(customersTable).values(testCustomer).execute();
    await db.insert(projectsTable).values(testProject).execute();
    await db.insert(timeEntriesTable).values(testTimeEntry).execute();

    const result = await deleteProject('project-1');

    expect(result).toBe(true);

    // Verify project is deleted
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, 'project-1'))
      .execute();

    expect(projects).toHaveLength(0);

    // Verify related time entries are deleted
    const timeEntries = await db.select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.project_id, 'project-1'))
      .execute();

    expect(timeEntries).toHaveLength(0);
  });

  it('should delete multiple time entries for the same project', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(organizationsTable).values(testOrganization).execute();
    await db.insert(customersTable).values(testCustomer).execute();
    await db.insert(projectsTable).values(testProject).execute();

    // Create multiple time entries for the same project
    const timeEntry2 = {
      ...testTimeEntry,
      id: 'time-2',
      description: 'Second time entry',
      start_time: new Date('2023-01-01T12:00:00Z'),
      end_time: new Date('2023-01-01T13:00:00Z')
    };

    await db.insert(timeEntriesTable).values([testTimeEntry, timeEntry2]).execute();

    const result = await deleteProject('project-1');

    expect(result).toBe(true);

    // Verify all related time entries are deleted
    const timeEntries = await db.select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.project_id, 'project-1'))
      .execute();

    expect(timeEntries).toHaveLength(0);
  });

  it('should return false when project does not exist', async () => {
    const result = await deleteProject('non-existent-project');

    expect(result).toBe(false);
  });

  it('should not affect other projects when deleting a specific project', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(organizationsTable).values(testOrganization).execute();
    await db.insert(customersTable).values(testCustomer).execute();
    
    // Create two projects
    const project2 = {
      ...testProject,
      id: 'project-2',
      name: 'Second Project'
    };

    await db.insert(projectsTable).values([testProject, project2]).execute();

    // Create time entries for both projects
    const timeEntry2 = {
      ...testTimeEntry,
      id: 'time-2',
      project_id: 'project-2',
      description: 'Time entry for project 2'
    };

    await db.insert(timeEntriesTable).values([testTimeEntry, timeEntry2]).execute();

    const result = await deleteProject('project-1');

    expect(result).toBe(true);

    // Verify project-1 is deleted but project-2 remains
    const remainingProjects = await db.select()
      .from(projectsTable)
      .execute();

    expect(remainingProjects).toHaveLength(1);
    expect(remainingProjects[0].id).toBe('project-2');

    // Verify only time entries for project-1 are deleted
    const remainingTimeEntries = await db.select()
      .from(timeEntriesTable)
      .execute();

    expect(remainingTimeEntries).toHaveLength(1);
    expect(remainingTimeEntries[0].project_id).toBe('project-2');
  });

  it('should handle deletion when project has no time entries', async () => {
    // Create prerequisite data without time entries
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(organizationsTable).values(testOrganization).execute();
    await db.insert(customersTable).values(testCustomer).execute();
    await db.insert(projectsTable).values(testProject).execute();

    const result = await deleteProject('project-1');

    expect(result).toBe(true);

    // Verify project is deleted
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, 'project-1'))
      .execute();

    expect(projects).toHaveLength(0);
  });
});