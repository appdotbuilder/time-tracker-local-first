import { db } from '../db';
import { timeEntriesTable } from '../db/schema';
import { type UpdateTimeEntryInput, type TimeEntry } from '../schema';
import { eq } from 'drizzle-orm';

export async function updateTimeEntry(input: UpdateTimeEntryInput): Promise<TimeEntry> {
  try {
    // First, get the current time entry to merge with updates
    const existingEntries = await db.select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, input.id))
      .execute();

    if (existingEntries.length === 0) {
      throw new Error(`Time entry with id ${input.id} not found`);
    }

    const existingEntry = existingEntries[0];

    // Prepare update values, keeping existing values for unspecified fields
    const updateValues: any = {
      updated_at: new Date()
    };

    // Only update fields that are provided in the input
    if (input.customer_id !== undefined) {
      updateValues.customer_id = input.customer_id;
    }
    if (input.project_id !== undefined) {
      updateValues.project_id = input.project_id;
    }
    if (input.description !== undefined) {
      updateValues.description = input.description;
    }
    if (input.start_time !== undefined) {
      updateValues.start_time = input.start_time;
    }
    if (input.end_time !== undefined) {
      updateValues.end_time = input.end_time;
    }
    if (input.tags !== undefined) {
      updateValues.tags = input.tags;
    }

    // Calculate duration if both start_time and end_time are available
    // Use updated values if provided, otherwise fall back to existing values
    const startTime = input.start_time !== undefined ? input.start_time : existingEntry.start_time;
    const endTime = input.end_time !== undefined ? input.end_time : existingEntry.end_time;

    if (startTime && endTime) {
      const durationMs = endTime.getTime() - startTime.getTime();
      updateValues.duration_minutes = Math.floor(durationMs / (1000 * 60));
    } else if (input.end_time === null) {
      // If end_time is explicitly set to null, clear the duration
      updateValues.duration_minutes = null;
    }

    // Perform the update
    const result = await db.update(timeEntriesTable)
      .set(updateValues)
      .where(eq(timeEntriesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Time entry update failed:', error);
    throw error;
  }
}