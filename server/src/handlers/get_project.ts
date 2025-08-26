import { db } from '../db';
import { projectsTable } from '../db/schema';
import { type Project } from '../schema';
import { eq } from 'drizzle-orm';

export const getProject = async (projectId: string): Promise<Project | null> => {
  try {
    const results = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1)
      .execute();

    if (results.length === 0) {
      return null;
    }

    const project = results[0];
    return project;
  } catch (error) {
    console.error('Project retrieval failed:', error);
    throw error;
  }
};