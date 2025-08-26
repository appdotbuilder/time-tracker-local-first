import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, customersTable, projectsTable, timeEntriesTable } from '../db/schema';
import { deleteTimeEntry } from '../handlers/delete_time_entry';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Test data setup
const userId = randomUUID();
const orgId = randomUUID();
const customerId = randomUUID();
const projectId = randomUUID();
const timeEntryId = randomUUID();

describe('deleteTimeEntry', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create prerequisite data
    await db.insert(usersTable).values({
      id: userId,
      email: 'test@example.com',
      name: 'Test User'
    });

    await db.insert(organizationsTable).values({
      id: orgId,
      name: 'Test Organization',
      owner_id: userId
    });

    await db.insert(customersTable).values({
      id: customerId,
      name: 'Test Customer',
      organization_id: orgId,
      created_by: userId
    });

    await db.insert(projectsTable).values({
      id: projectId,
      name: 'Test Project',
      customer_id: customerId,
      organization_id: orgId,
      created_by: userId
    });

    await db.insert(timeEntriesTable).values({
      id: timeEntryId,
      user_id: userId,
      customer_id: customerId,
      project_id: projectId,
      description: 'Test work',
      start_time: new Date('2024-01-01T09:00:00Z'),
      end_time: new Date('2024-01-01T10:00:00Z'),
      duration_minutes: 60,
      tags: ['development', 'testing']
    });
  });

  afterEach(resetDB);

  it('should delete an existing time entry', async () => {
    const result = await deleteTimeEntry(timeEntryId);

    expect(result).toBe(true);

    // Verify the time entry was deleted from database
    const timeEntries = await db.select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, timeEntryId))
      .execute();

    expect(timeEntries).toHaveLength(0);
  });

  it('should return false when deleting non-existent time entry', async () => {
    const nonExistentId = randomUUID();
    
    const result = await deleteTimeEntry(nonExistentId);

    expect(result).toBe(false);

    // Verify original time entry still exists
    const timeEntries = await db.select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, timeEntryId))
      .execute();

    expect(timeEntries).toHaveLength(1);
    expect(timeEntries[0].id).toBe(timeEntryId);
  });

  it('should delete only the specified time entry', async () => {
    // Create another time entry
    const secondTimeEntryId = randomUUID();
    await db.insert(timeEntriesTable).values({
      id: secondTimeEntryId,
      user_id: userId,
      customer_id: customerId,
      project_id: projectId,
      description: 'Another test work',
      start_time: new Date('2024-01-01T11:00:00Z'),
      end_time: new Date('2024-01-01T12:00:00Z'),
      duration_minutes: 60,
      tags: ['development']
    });

    // Delete the first time entry
    const result = await deleteTimeEntry(timeEntryId);

    expect(result).toBe(true);

    // Verify first time entry was deleted
    const firstTimeEntry = await db.select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, timeEntryId))
      .execute();

    expect(firstTimeEntry).toHaveLength(0);

    // Verify second time entry still exists
    const secondTimeEntry = await db.select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, secondTimeEntryId))
      .execute();

    expect(secondTimeEntry).toHaveLength(1);
    expect(secondTimeEntry[0].id).toBe(secondTimeEntryId);
    expect(secondTimeEntry[0].description).toBe('Another test work');
  });

  it('should handle empty string ID gracefully', async () => {
    const result = await deleteTimeEntry('');

    expect(result).toBe(false);

    // Verify original time entry still exists
    const timeEntries = await db.select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, timeEntryId))
      .execute();

    expect(timeEntries).toHaveLength(1);
  });
});