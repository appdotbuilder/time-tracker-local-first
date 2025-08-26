import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, customersTable, projectsTable, organizationsTable, timeEntriesTable } from '../db/schema';
import { type CreateTimeEntryInput } from '../schema';
import { createTimeEntry } from '../handlers/create_time_entry';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

describe('createTimeEntry', () => {
  let userId: string;
  let customerId: string;
  let projectId: string;
  let organizationId: string;

  beforeEach(async () => {
    await createDB();
    
    // Create prerequisite data
    userId = nanoid();
    organizationId = nanoid();
    customerId = nanoid();
    projectId = nanoid();

    // Create user
    await db.insert(usersTable)
      .values({
        id: userId,
        email: 'test@example.com',
        name: 'Test User'
      })
      .execute();

    // Create organization
    await db.insert(organizationsTable)
      .values({
        id: organizationId,
        name: 'Test Org',
        owner_id: userId
      })
      .execute();

    // Create customer
    await db.insert(customersTable)
      .values({
        id: customerId,
        name: 'Test Customer',
        organization_id: organizationId,
        created_by: userId
      })
      .execute();

    // Create project
    await db.insert(projectsTable)
      .values({
        id: projectId,
        name: 'Test Project',
        customer_id: customerId,
        organization_id: organizationId,
        created_by: userId
      })
      .execute();
  });

  afterEach(resetDB);

  it('should create a time entry with minimal data', async () => {
    const startTime = new Date('2024-01-15T09:00:00Z');
    const testInput: CreateTimeEntryInput = {
      description: 'Working on project tasks',
      start_time: startTime
    };

    const result = await createTimeEntry(testInput, userId);

    expect(result.id).toBeDefined();
    expect(result.user_id).toBe(userId);
    expect(result.customer_id).toBeNull();
    expect(result.project_id).toBeNull();
    expect(result.description).toBe('Working on project tasks');
    expect(result.start_time).toEqual(startTime);
    expect(result.end_time).toBeNull();
    expect(result.duration_minutes).toBeNull();
    expect(result.tags).toEqual([]);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a time entry with customer and project', async () => {
    const startTime = new Date('2024-01-15T09:00:00Z');
    const testInput: CreateTimeEntryInput = {
      customer_id: customerId,
      project_id: projectId,
      description: 'Project development work',
      start_time: startTime
    };

    const result = await createTimeEntry(testInput, userId);

    expect(result.customer_id).toBe(customerId);
    expect(result.project_id).toBe(projectId);
    expect(result.description).toBe('Project development work');
    expect(result.user_id).toBe(userId);
  });

  it('should calculate duration when end_time is provided', async () => {
    const startTime = new Date('2024-01-15T09:00:00Z');
    const endTime = new Date('2024-01-15T11:30:00Z'); // 2.5 hours = 150 minutes
    
    const testInput: CreateTimeEntryInput = {
      description: 'Timed work session',
      start_time: startTime,
      end_time: endTime
    };

    const result = await createTimeEntry(testInput, userId);

    expect(result.start_time).toEqual(startTime);
    expect(result.end_time).toEqual(endTime);
    expect(result.duration_minutes).toBe(150);
  });

  it('should handle tags correctly', async () => {
    const startTime = new Date('2024-01-15T09:00:00Z');
    const testInput: CreateTimeEntryInput = {
      description: 'Tagged work',
      start_time: startTime,
      tags: ['development', 'frontend', 'urgent']
    };

    const result = await createTimeEntry(testInput, userId);

    expect(result.tags).toEqual(['development', 'frontend', 'urgent']);
  });

  it('should save time entry to database', async () => {
    const startTime = new Date('2024-01-15T09:00:00Z');
    const endTime = new Date('2024-01-15T10:15:00Z');
    
    const testInput: CreateTimeEntryInput = {
      customer_id: customerId,
      project_id: projectId,
      description: 'Database test work',
      start_time: startTime,
      end_time: endTime,
      tags: ['testing']
    };

    const result = await createTimeEntry(testInput, userId);

    // Verify in database
    const timeEntries = await db.select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, result.id))
      .execute();

    expect(timeEntries).toHaveLength(1);
    const savedEntry = timeEntries[0];
    
    expect(savedEntry.user_id).toBe(userId);
    expect(savedEntry.customer_id).toBe(customerId);
    expect(savedEntry.project_id).toBe(projectId);
    expect(savedEntry.description).toBe('Database test work');
    expect(savedEntry.start_time).toEqual(startTime);
    expect(savedEntry.end_time).toEqual(endTime);
    expect(savedEntry.duration_minutes).toBe(75); // 1 hour 15 minutes
    expect(savedEntry.tags).toEqual(['testing']);
    expect(savedEntry.created_at).toBeInstanceOf(Date);
    expect(savedEntry.updated_at).toBeInstanceOf(Date);
  });

  it('should handle edge case of same start and end time', async () => {
    const startTime = new Date('2024-01-15T09:00:00Z');
    const endTime = new Date('2024-01-15T09:00:00Z');
    
    const testInput: CreateTimeEntryInput = {
      description: 'Zero duration work',
      start_time: startTime,
      end_time: endTime
    };

    const result = await createTimeEntry(testInput, userId);

    expect(result.duration_minutes).toBe(0);
  });

  it('should handle fractional minutes correctly', async () => {
    const startTime = new Date('2024-01-15T09:00:00Z');
    const endTime = new Date('2024-01-15T09:00:30Z'); // 30 seconds = 0.5 minutes
    
    const testInput: CreateTimeEntryInput = {
      description: 'Short work session',
      start_time: startTime,
      end_time: endTime
    };

    const result = await createTimeEntry(testInput, userId);

    expect(result.duration_minutes).toBe(0); // Should floor to 0
  });

  it('should create time entry with null customer and project when not provided', async () => {
    const startTime = new Date('2024-01-15T09:00:00Z');
    const testInput: CreateTimeEntryInput = {
      description: 'General work',
      start_time: startTime,
      customer_id: null,
      project_id: null
    };

    const result = await createTimeEntry(testInput, userId);

    expect(result.customer_id).toBeNull();
    expect(result.project_id).toBeNull();
  });
});