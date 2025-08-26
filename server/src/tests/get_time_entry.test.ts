import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, customersTable, projectsTable, timeEntriesTable } from '../db/schema';
import { getTimeEntry } from '../handlers/get_time_entry';

describe('getTimeEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return time entry when it exists', async () => {
    // Create prerequisite data
    const user = await db.insert(usersTable)
      .values({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    const organization = await db.insert(organizationsTable)
      .values({
        id: 'org-1',
        name: 'Test Org',
        owner_id: 'user-1'
      })
      .returning()
      .execute();

    const customer = await db.insert(customersTable)
      .values({
        id: 'customer-1',
        name: 'Test Customer',
        email: 'customer@example.com',
        organization_id: 'org-1',
        created_by: 'user-1'
      })
      .returning()
      .execute();

    const project = await db.insert(projectsTable)
      .values({
        id: 'project-1',
        name: 'Test Project',
        customer_id: 'customer-1',
        organization_id: 'org-1',
        created_by: 'user-1'
      })
      .returning()
      .execute();

    // Create time entry
    const testStartTime = new Date('2024-01-15T09:00:00Z');
    const testEndTime = new Date('2024-01-15T17:00:00Z');
    
    await db.insert(timeEntriesTable)
      .values({
        id: 'time-entry-1',
        user_id: 'user-1',
        customer_id: 'customer-1',
        project_id: 'project-1',
        description: 'Working on feature',
        start_time: testStartTime,
        end_time: testEndTime,
        duration_minutes: 480,
        tags: ['development', 'frontend']
      })
      .execute();

    // Test the handler
    const result = await getTimeEntry('time-entry-1');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('time-entry-1');
    expect(result!.user_id).toEqual('user-1');
    expect(result!.customer_id).toEqual('customer-1');
    expect(result!.project_id).toEqual('project-1');
    expect(result!.description).toEqual('Working on feature');
    expect(result!.start_time).toEqual(testStartTime);
    expect(result!.end_time).toEqual(testEndTime);
    expect(result!.duration_minutes).toEqual(480);
    expect(result!.tags).toEqual(['development', 'frontend']);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when time entry does not exist', async () => {
    const result = await getTimeEntry('nonexistent-id');

    expect(result).toBeNull();
  });

  it('should handle time entry with null customer_id and project_id', async () => {
    // Create prerequisite user
    await db.insert(usersTable)
      .values({
        id: 'user-2',
        email: 'user2@example.com',
        name: 'Test User 2'
      })
      .execute();

    const testStartTime = new Date('2024-01-15T14:00:00Z');

    // Create time entry without customer and project
    await db.insert(timeEntriesTable)
      .values({
        id: 'time-entry-2',
        user_id: 'user-2',
        customer_id: null,
        project_id: null,
        description: 'General work',
        start_time: testStartTime,
        end_time: null,
        duration_minutes: null,
        tags: []
      })
      .execute();

    const result = await getTimeEntry('time-entry-2');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('time-entry-2');
    expect(result!.user_id).toEqual('user-2');
    expect(result!.customer_id).toBeNull();
    expect(result!.project_id).toBeNull();
    expect(result!.description).toEqual('General work');
    expect(result!.start_time).toEqual(testStartTime);
    expect(result!.end_time).toBeNull();
    expect(result!.duration_minutes).toBeNull();
    expect(result!.tags).toEqual([]);
  });

  it('should handle time entry with tags array', async () => {
    // Create prerequisite user
    await db.insert(usersTable)
      .values({
        id: 'user-3',
        email: 'user3@example.com',
        name: 'Test User 3'
      })
      .execute();

    const testStartTime = new Date('2024-01-16T10:00:00Z');

    // Create time entry with multiple tags
    await db.insert(timeEntriesTable)
      .values({
        id: 'time-entry-3',
        user_id: 'user-3',
        customer_id: null,
        project_id: null,
        description: 'Research and planning',
        start_time: testStartTime,
        end_time: null,
        duration_minutes: null,
        tags: ['research', 'planning', 'documentation', 'analysis']
      })
      .execute();

    const result = await getTimeEntry('time-entry-3');

    expect(result).not.toBeNull();
    expect(result!.tags).toHaveLength(4);
    expect(result!.tags).toContain('research');
    expect(result!.tags).toContain('planning');
    expect(result!.tags).toContain('documentation');
    expect(result!.tags).toContain('analysis');
    expect(Array.isArray(result!.tags)).toBe(true);
  });
});