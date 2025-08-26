import { db } from '../db';
import { timeEntriesTable } from '../db/schema';
import { type CreateTimeEntryInput, type TimeEntry } from '../schema';
import { nanoid } from 'nanoid';

export const createTimeEntry = async (input: CreateTimeEntryInput, userId: string): Promise<TimeEntry> => {
  try {
    // Calculate duration if end_time is provided
    const durationMinutes = input.end_time 
      ? Math.floor((input.end_time.getTime() - input.start_time.getTime()) / (1000 * 60))
      : null;

    // Insert time entry record
    const result = await db.insert(timeEntriesTable)
      .values({
        id: nanoid(),
        user_id: userId,
        customer_id: input.customer_id || null,
        project_id: input.project_id || null,
        description: input.description,
        start_time: input.start_time,
        end_time: input.end_time || null,
        duration_minutes: durationMinutes,
        tags: input.tags || []
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Time entry creation failed:', error);
    throw error;
  }
};