import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, customersTable, organizationsTable, projectsTable, timeEntriesTable } from '../db/schema';
import { type GetTimeEntriesInput } from '../schema';
import { getTimeEntries } from '../handlers/get_time_entries';

describe('getTimeEntries', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Create test data
  let userId: string;
  let organizationId: string;
  let customerId: string;
  let projectId: string;

  beforeEach(async () => {
    // Create user
    const user = await db.insert(usersTable)
      .values({
        id: 'user-1',
        email: 'user@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();
    userId = user[0].id;

    // Create organization
    const organization = await db.insert(organizationsTable)
      .values({
        id: 'org-1',
        name: 'Test Organization',
        owner_id: userId
      })
      .returning()
      .execute();
    organizationId = organization[0].id;

    // Create customer
    const customer = await db.insert(customersTable)
      .values({
        id: 'customer-1',
        name: 'Test Customer',
        email: 'customer@example.com',
        organization_id: organizationId,
        created_by: userId
      })
      .returning()
      .execute();
    customerId = customer[0].id;

    // Create project
    const project = await db.insert(projectsTable)
      .values({
        id: 'project-1',
        name: 'Test Project',
        customer_id: customerId,
        organization_id: organizationId,
        created_by: userId
      })
      .returning()
      .execute();
    projectId = project[0].id;
  });

  it('should return all time entries when no filters are applied', async () => {
    // Create test time entries
    await db.insert(timeEntriesTable)
      .values([
        {
          id: 'entry-1',
          user_id: userId,
          customer_id: customerId,
          project_id: projectId,
          description: 'Work on feature 1',
          start_time: new Date('2024-01-01T09:00:00Z'),
          end_time: new Date('2024-01-01T10:00:00Z'),
          duration_minutes: 60,
          tags: ['development', 'frontend']
        },
        {
          id: 'entry-2',
          user_id: userId,
          customer_id: customerId,
          project_id: projectId,
          description: 'Code review',
          start_time: new Date('2024-01-02T14:00:00Z'),
          end_time: new Date('2024-01-02T15:00:00Z'),
          duration_minutes: 60,
          tags: ['review', 'backend']
        }
      ])
      .execute();

    const input: GetTimeEntriesInput = {};
    const result = await getTimeEntries(input);

    expect(result).toHaveLength(2);
    expect(result[0].description).toEqual('Work on feature 1');
    expect(result[1].description).toEqual('Code review');
  });

  it('should filter by user_id', async () => {
    // Create another user
    const user2 = await db.insert(usersTable)
      .values({
        id: 'user-2',
        email: 'user2@example.com',
        name: 'Test User 2'
      })
      .returning()
      .execute();

    // Create time entries for different users
    await db.insert(timeEntriesTable)
      .values([
        {
          id: 'entry-1',
          user_id: userId,
          description: 'User 1 work',
          start_time: new Date('2024-01-01T09:00:00Z'),
          tags: []
        },
        {
          id: 'entry-2',
          user_id: user2[0].id,
          description: 'User 2 work',
          start_time: new Date('2024-01-01T10:00:00Z'),
          tags: []
        }
      ])
      .execute();

    const input: GetTimeEntriesInput = { user_id: userId };
    const result = await getTimeEntries(input);

    expect(result).toHaveLength(1);
    expect(result[0].description).toEqual('User 1 work');
    expect(result[0].user_id).toEqual(userId);
  });

  it('should filter by customer_id', async () => {
    // Create another customer
    const customer2 = await db.insert(customersTable)
      .values({
        id: 'customer-2',
        name: 'Test Customer 2',
        organization_id: organizationId,
        created_by: userId
      })
      .returning()
      .execute();

    // Create time entries for different customers
    await db.insert(timeEntriesTable)
      .values([
        {
          id: 'entry-1',
          user_id: userId,
          customer_id: customerId,
          description: 'Customer 1 work',
          start_time: new Date('2024-01-01T09:00:00Z'),
          tags: []
        },
        {
          id: 'entry-2',
          user_id: userId,
          customer_id: customer2[0].id,
          description: 'Customer 2 work',
          start_time: new Date('2024-01-01T10:00:00Z'),
          tags: []
        }
      ])
      .execute();

    const input: GetTimeEntriesInput = { customer_id: customerId };
    const result = await getTimeEntries(input);

    expect(result).toHaveLength(1);
    expect(result[0].description).toEqual('Customer 1 work');
    expect(result[0].customer_id).toEqual(customerId);
  });

  it('should filter by project_id', async () => {
    // Create another project
    const project2 = await db.insert(projectsTable)
      .values({
        id: 'project-2',
        name: 'Test Project 2',
        customer_id: customerId,
        organization_id: organizationId,
        created_by: userId
      })
      .returning()
      .execute();

    // Create time entries for different projects
    await db.insert(timeEntriesTable)
      .values([
        {
          id: 'entry-1',
          user_id: userId,
          project_id: projectId,
          description: 'Project 1 work',
          start_time: new Date('2024-01-01T09:00:00Z'),
          tags: []
        },
        {
          id: 'entry-2',
          user_id: userId,
          project_id: project2[0].id,
          description: 'Project 2 work',
          start_time: new Date('2024-01-01T10:00:00Z'),
          tags: []
        }
      ])
      .execute();

    const input: GetTimeEntriesInput = { project_id: projectId };
    const result = await getTimeEntries(input);

    expect(result).toHaveLength(1);
    expect(result[0].description).toEqual('Project 1 work');
    expect(result[0].project_id).toEqual(projectId);
  });

  it('should filter by date range', async () => {
    // Create time entries with different dates
    await db.insert(timeEntriesTable)
      .values([
        {
          id: 'entry-1',
          user_id: userId,
          description: 'Early work',
          start_time: new Date('2024-01-01T09:00:00Z'),
          tags: []
        },
        {
          id: 'entry-2',
          user_id: userId,
          description: 'Mid work',
          start_time: new Date('2024-01-05T09:00:00Z'),
          tags: []
        },
        {
          id: 'entry-3',
          user_id: userId,
          description: 'Late work',
          start_time: new Date('2024-01-10T09:00:00Z'),
          tags: []
        }
      ])
      .execute();

    // Filter by start_date
    const input1: GetTimeEntriesInput = { 
      start_date: new Date('2024-01-05T00:00:00Z')
    };
    const result1 = await getTimeEntries(input1);
    expect(result1).toHaveLength(2);
    expect(result1.map(r => r.description)).toEqual(['Mid work', 'Late work']);

    // Filter by end_date
    const input2: GetTimeEntriesInput = { 
      end_date: new Date('2024-01-05T23:59:59Z')
    };
    const result2 = await getTimeEntries(input2);
    expect(result2).toHaveLength(2);
    expect(result2.map(r => r.description)).toEqual(['Early work', 'Mid work']);

    // Filter by date range
    const input3: GetTimeEntriesInput = { 
      start_date: new Date('2024-01-02T00:00:00Z'),
      end_date: new Date('2024-01-08T23:59:59Z')
    };
    const result3 = await getTimeEntries(input3);
    expect(result3).toHaveLength(1);
    expect(result3[0].description).toEqual('Mid work');
  });

  it('should filter by tags', async () => {
    // Create time entries with different tags
    await db.insert(timeEntriesTable)
      .values([
        {
          id: 'entry-1',
          user_id: userId,
          description: 'Frontend work',
          start_time: new Date('2024-01-01T09:00:00Z'),
          tags: ['frontend', 'development']
        },
        {
          id: 'entry-2',
          user_id: userId,
          description: 'Backend work',
          start_time: new Date('2024-01-01T10:00:00Z'),
          tags: ['backend', 'api']
        },
        {
          id: 'entry-3',
          user_id: userId,
          description: 'Review work',
          start_time: new Date('2024-01-01T11:00:00Z'),
          tags: ['review', 'testing']
        }
      ])
      .execute();

    // Filter by single tag
    const input1: GetTimeEntriesInput = { tags: ['frontend'] };
    const result1 = await getTimeEntries(input1);
    expect(result1).toHaveLength(1);
    expect(result1[0].description).toEqual('Frontend work');

    // Filter by multiple tags (should return entries with any of the tags)
    const input2: GetTimeEntriesInput = { tags: ['backend', 'review'] };
    const result2 = await getTimeEntries(input2);
    expect(result2).toHaveLength(2);
    expect(result2.map(r => r.description).sort()).toEqual(['Backend work', 'Review work']);
  });

  it('should combine multiple filters', async () => {
    // Create another user
    const user2 = await db.insert(usersTable)
      .values({
        id: 'user-2',
        email: 'user2@example.com',
        name: 'Test User 2'
      })
      .returning()
      .execute();

    // Create time entries with various combinations
    await db.insert(timeEntriesTable)
      .values([
        {
          id: 'entry-1',
          user_id: userId,
          customer_id: customerId,
          description: 'User 1, Customer 1, with dev tag',
          start_time: new Date('2024-01-05T09:00:00Z'),
          tags: ['development']
        },
        {
          id: 'entry-2',
          user_id: userId,
          customer_id: customerId,
          description: 'User 1, Customer 1, with review tag',
          start_time: new Date('2024-01-05T10:00:00Z'),
          tags: ['review']
        },
        {
          id: 'entry-3',
          user_id: user2[0].id,
          customer_id: customerId,
          description: 'User 2, Customer 1, with dev tag',
          start_time: new Date('2024-01-05T11:00:00Z'),
          tags: ['development']
        }
      ])
      .execute();

    // Filter by user_id, customer_id, and tags
    const input: GetTimeEntriesInput = {
      user_id: userId,
      customer_id: customerId,
      tags: ['development']
    };
    const result = await getTimeEntries(input);

    expect(result).toHaveLength(1);
    expect(result[0].description).toEqual('User 1, Customer 1, with dev tag');
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].customer_id).toEqual(customerId);
    expect(result[0].tags).toContain('development');
  });

  it('should return empty array when no entries match filters', async () => {
    // Create a time entry that won't match our filter
    await db.insert(timeEntriesTable)
      .values({
        id: 'entry-1',
        user_id: userId,
        description: 'Some work',
        start_time: new Date('2024-01-01T09:00:00Z'),
        tags: []
      })
      .execute();

    // Filter by non-existent user
    const input: GetTimeEntriesInput = { user_id: 'non-existent-user' };
    const result = await getTimeEntries(input);

    expect(result).toHaveLength(0);
  });

  it('should handle null values in optional fields', async () => {
    // Create time entry with null customer_id and project_id
    await db.insert(timeEntriesTable)
      .values({
        id: 'entry-1',
        user_id: userId,
        customer_id: null,
        project_id: null,
        description: 'General work',
        start_time: new Date('2024-01-01T09:00:00Z'),
        tags: ['general']
      })
      .execute();

    const input: GetTimeEntriesInput = {};
    const result = await getTimeEntries(input);

    expect(result).toHaveLength(1);
    expect(result[0].customer_id).toBeNull();
    expect(result[0].project_id).toBeNull();
    expect(result[0].description).toEqual('General work');
  });
});