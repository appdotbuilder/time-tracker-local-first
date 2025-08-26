import { db } from '../db';
import { timeEntriesTable } from '../db/schema';
import { type GetTimeEntriesInput, type TimeEntry } from '../schema';
import { eq, gte, lte, and, sql, SQL } from 'drizzle-orm';

export async function getTimeEntries(input: GetTimeEntriesInput): Promise<TimeEntry[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    // Filter by user_id
    if (input.user_id) {
      conditions.push(eq(timeEntriesTable.user_id, input.user_id));
    }

    // Filter by customer_id
    if (input.customer_id) {
      conditions.push(eq(timeEntriesTable.customer_id, input.customer_id));
    }

    // Filter by project_id
    if (input.project_id) {
      conditions.push(eq(timeEntriesTable.project_id, input.project_id));
    }

    // Filter by start_date (entries starting from this date)
    if (input.start_date) {
      conditions.push(gte(timeEntriesTable.start_time, input.start_date));
    }

    // Filter by end_date (entries starting before or at this date)
    if (input.end_date) {
      conditions.push(lte(timeEntriesTable.start_time, input.end_date));
    }

    // Filter by tags (entries containing any of the specified tags)
    if (input.tags && input.tags.length > 0) {
      // Format array for PostgreSQL - need to create proper array literal with braces
      const formattedTags = `{${input.tags.map(tag => `"${tag}"`).join(',')}}`;
      conditions.push(
        sql`${timeEntriesTable.tags} && ${formattedTags}::text[]`
      );
    }

    // Build the final query with all conditions and ordering
    const results = conditions.length > 0
      ? await db
          .select()
          .from(timeEntriesTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(timeEntriesTable.start_time)
          .execute()
      : await db
          .select()
          .from(timeEntriesTable)
          .orderBy(timeEntriesTable.start_time)
          .execute();

    // Return time entries (no numeric field conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Failed to fetch time entries:', error);
    throw error;
  }
}