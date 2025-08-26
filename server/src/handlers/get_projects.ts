import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type GetProjectsInput, type Project } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export const getProjects = async (input: GetProjectsInput): Promise<Project[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Organization filter is required
    conditions.push(eq(projectsTable.organization_id, input.organization_id));
    
    // Optional customer filter
    if (input.customer_id) {
      conditions.push(eq(projectsTable.customer_id, input.customer_id));
    }

    // Build query with where clause
    const query = db.select()
      .from(projectsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions));

    const results = await query.execute();

    return results;
  } catch (error) {
    console.error('Get projects failed:', error);
    throw error;
  }
};