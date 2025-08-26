import { db } from '../db';
import { timeEntriesTable } from '../db/schema';
import { type TimeEntry } from '../schema';
import { eq } from 'drizzle-orm';

export async function getTimeEntry(timeEntryId: string): Promise<TimeEntry | null> {
  try {
    const result = await db.select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, timeEntryId))
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null;
    }

    const timeEntry = result[0];
    return {
      ...timeEntry,
      // Note: duration_minutes is already an integer, no conversion needed
      // tags is already an array, no conversion needed
      // All timestamp fields are already Date objects
    };
  } catch (error) {
    console.error('Failed to get time entry:', error);
    throw error;
  }
}