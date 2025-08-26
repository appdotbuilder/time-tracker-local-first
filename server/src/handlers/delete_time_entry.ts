import { db } from '../db';
import { timeEntriesTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteTimeEntry = async (timeEntryId: string): Promise<boolean> => {
  try {
    // Delete the time entry by ID
    const result = await db.delete(timeEntriesTable)
      .where(eq(timeEntriesTable.id, timeEntryId))
      .execute();

    // Return true if a row was deleted, false if no row was found
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Time entry deletion failed:', error);
    throw error;
  }
};