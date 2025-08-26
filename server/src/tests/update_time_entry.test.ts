import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, customersTable, projectsTable, timeEntriesTable } from '../db/schema';
import { type UpdateTimeEntryInput } from '../schema';
import { updateTimeEntry } from '../handlers/update_time_entry';
import { eq } from 'drizzle-orm';

describe('updateTimeEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup helper
  const setupTestData = async () => {
    // Create user
    const user = await db.insert(usersTable)
      .values({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    // Create organization
    const organization = await db.insert(organizationsTable)
      .values({
        id: 'org-1',
        name: 'Test Organization',
        owner_id: 'user-1'
      })
      .returning()
      .execute();

    // Create customer
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

    // Create project
    const project = await db.insert(projectsTable)
      .values({
        id: 'project-1',
        name: 'Test Project',
        description: 'Test project description',
        customer_id: 'customer-1',
        organization_id: 'org-1',
        created_by: 'user-1'
      })
      .returning()
      .execute();

    // Create time entry
    const startTime = new Date('2024-01-01T09:00:00Z');
    const endTime = new Date('2024-01-01T10:30:00Z');
    const timeEntry = await db.insert(timeEntriesTable)
      .values({
        id: 'time-entry-1',
        user_id: 'user-1',
        customer_id: 'customer-1',
        project_id: 'project-1',
        description: 'Initial time entry',
        start_time: startTime,
        end_time: endTime,
        duration_minutes: 90,
        tags: ['initial', 'test']
      })
      .returning()
      .execute();

    return {
      user: user[0],
      organization: organization[0],
      customer: customer[0],
      project: project[0],
      timeEntry: timeEntry[0]
    };
  };

  it('should update time entry description', async () => {
    const { timeEntry } = await setupTestData();

    const updateInput: UpdateTimeEntryInput = {
      id: timeEntry.id,
      description: 'Updated description'
    };

    const result = await updateTimeEntry(updateInput);

    expect(result.id).toEqual(timeEntry.id);
    expect(result.description).toEqual('Updated description');
    expect(result.user_id).toEqual(timeEntry.user_id);
    expect(result.customer_id).toEqual(timeEntry.customer_id);
    expect(result.project_id).toEqual(timeEntry.project_id);
    expect(result.start_time).toEqual(timeEntry.start_time);
    expect(result.end_time).toEqual(timeEntry.end_time);
    expect(result.duration_minutes).toEqual(timeEntry.duration_minutes);
    expect(result.tags).toEqual(timeEntry.tags);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > timeEntry.updated_at).toBe(true);
  });

  it('should update time entry tags', async () => {
    const { timeEntry } = await setupTestData();

    const updateInput: UpdateTimeEntryInput = {
      id: timeEntry.id,
      tags: ['updated', 'tag', 'list']
    };

    const result = await updateTimeEntry(updateInput);

    expect(result.tags).toEqual(['updated', 'tag', 'list']);
    expect(result.description).toEqual(timeEntry.description); // Should remain unchanged
  });

  it('should update customer and project references', async () => {
    const { timeEntry } = await setupTestData();

    // Create additional customer and project for the update
    const newCustomer = await db.insert(customersTable)
      .values({
        id: 'customer-2',
        name: 'New Customer',
        organization_id: 'org-1',
        created_by: 'user-1'
      })
      .returning()
      .execute();

    const newProject = await db.insert(projectsTable)
      .values({
        id: 'project-2',
        name: 'New Project',
        customer_id: 'customer-2',
        organization_id: 'org-1',
        created_by: 'user-1'
      })
      .returning()
      .execute();

    const updateInput: UpdateTimeEntryInput = {
      id: timeEntry.id,
      customer_id: 'customer-2',
      project_id: 'project-2'
    };

    const result = await updateTimeEntry(updateInput);

    expect(result.customer_id).toEqual('customer-2');
    expect(result.project_id).toEqual('project-2');
  });

  it('should set customer and project to null', async () => {
    const { timeEntry } = await setupTestData();

    const updateInput: UpdateTimeEntryInput = {
      id: timeEntry.id,
      customer_id: null,
      project_id: null
    };

    const result = await updateTimeEntry(updateInput);

    expect(result.customer_id).toBeNull();
    expect(result.project_id).toBeNull();
  });

  it('should recalculate duration when updating start_time', async () => {
    const { timeEntry } = await setupTestData();

    const newStartTime = new Date('2024-01-01T08:00:00Z');

    const updateInput: UpdateTimeEntryInput = {
      id: timeEntry.id,
      start_time: newStartTime
    };

    const result = await updateTimeEntry(updateInput);

    expect(result.start_time).toEqual(newStartTime);
    expect(result.end_time).toEqual(timeEntry.end_time);
    // Duration should be recalculated: 08:00 to 10:30 = 150 minutes
    expect(result.duration_minutes).toEqual(150);
  });

  it('should recalculate duration when updating end_time', async () => {
    const { timeEntry } = await setupTestData();

    const newEndTime = new Date('2024-01-01T11:00:00Z');

    const updateInput: UpdateTimeEntryInput = {
      id: timeEntry.id,
      end_time: newEndTime
    };

    const result = await updateTimeEntry(updateInput);

    expect(result.end_time).toEqual(newEndTime);
    expect(result.start_time).toEqual(timeEntry.start_time);
    // Duration should be recalculated: 09:00 to 11:00 = 120 minutes
    expect(result.duration_minutes).toEqual(120);
  });

  it('should recalculate duration when updating both start_time and end_time', async () => {
    const { timeEntry } = await setupTestData();

    const newStartTime = new Date('2024-01-01T14:00:00Z');
    const newEndTime = new Date('2024-01-01T16:15:00Z');

    const updateInput: UpdateTimeEntryInput = {
      id: timeEntry.id,
      start_time: newStartTime,
      end_time: newEndTime
    };

    const result = await updateTimeEntry(updateInput);

    expect(result.start_time).toEqual(newStartTime);
    expect(result.end_time).toEqual(newEndTime);
    // Duration should be recalculated: 14:00 to 16:15 = 135 minutes
    expect(result.duration_minutes).toEqual(135);
  });

  it('should clear duration when setting end_time to null', async () => {
    const { timeEntry } = await setupTestData();

    const updateInput: UpdateTimeEntryInput = {
      id: timeEntry.id,
      end_time: null
    };

    const result = await updateTimeEntry(updateInput);

    expect(result.end_time).toBeNull();
    expect(result.duration_minutes).toBeNull();
    expect(result.start_time).toEqual(timeEntry.start_time);
  });

  it('should update multiple fields at once', async () => {
    const { timeEntry } = await setupTestData();

    const newStartTime = new Date('2024-01-01T10:00:00Z');
    const newEndTime = new Date('2024-01-01T12:00:00Z');

    const updateInput: UpdateTimeEntryInput = {
      id: timeEntry.id,
      description: 'Comprehensive update',
      start_time: newStartTime,
      end_time: newEndTime,
      customer_id: null,
      project_id: null,
      tags: ['comprehensive', 'update']
    };

    const result = await updateTimeEntry(updateInput);

    expect(result.description).toEqual('Comprehensive update');
    expect(result.start_time).toEqual(newStartTime);
    expect(result.end_time).toEqual(newEndTime);
    expect(result.duration_minutes).toEqual(120); // 2 hours
    expect(result.customer_id).toBeNull();
    expect(result.project_id).toBeNull();
    expect(result.tags).toEqual(['comprehensive', 'update']);
  });

  it('should save changes to database', async () => {
    const { timeEntry } = await setupTestData();

    const updateInput: UpdateTimeEntryInput = {
      id: timeEntry.id,
      description: 'Database persistence test'
    };

    await updateTimeEntry(updateInput);

    // Verify the change was persisted
    const updatedEntries = await db.select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, timeEntry.id))
      .execute();

    expect(updatedEntries).toHaveLength(1);
    expect(updatedEntries[0].description).toEqual('Database persistence test');
  });

  it('should throw error for non-existent time entry', async () => {
    await setupTestData();

    const updateInput: UpdateTimeEntryInput = {
      id: 'non-existent-id',
      description: 'This should fail'
    };

    await expect(updateTimeEntry(updateInput)).rejects.toThrow(/Time entry with id non-existent-id not found/i);
  });

  it('should handle duration calculation edge case with same start and end time', async () => {
    const { timeEntry } = await setupTestData();

    const sameTime = new Date('2024-01-01T12:00:00Z');

    const updateInput: UpdateTimeEntryInput = {
      id: timeEntry.id,
      start_time: sameTime,
      end_time: sameTime
    };

    const result = await updateTimeEntry(updateInput);

    expect(result.start_time).toEqual(sameTime);
    expect(result.end_time).toEqual(sameTime);
    expect(result.duration_minutes).toEqual(0);
  });
});