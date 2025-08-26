import { db } from '../db';
import { projectsTable, timeEntriesTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteProject = async (projectId: string): Promise<boolean> => {
  try {
    // First, delete related time entries (cascading deletion)
    await db.delete(timeEntriesTable)
      .where(eq(timeEntriesTable.project_id, projectId))
      .execute();

    // Then delete the project
    const result = await db.delete(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .execute();

    // Return true if at least one row was affected (project was deleted)
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Project deletion failed:', error);
    throw error;
  }
};