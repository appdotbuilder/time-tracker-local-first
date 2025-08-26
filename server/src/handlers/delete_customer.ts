import { db } from '../db';
import { customersTable, projectsTable, timeEntriesTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteCustomer(customerId: string): Promise<boolean> {
  try {
    // First, delete all time entries related to projects of this customer
    await db.delete(timeEntriesTable)
      .where(eq(timeEntriesTable.customer_id, customerId))
      .execute();

    // Delete all time entries related to projects of this customer
    const customerProjects = await db.select({ id: projectsTable.id })
      .from(projectsTable)
      .where(eq(projectsTable.customer_id, customerId))
      .execute();

    if (customerProjects.length > 0) {
      const projectIds = customerProjects.map(project => project.id);
      
      // Delete time entries for each project
      for (const projectId of projectIds) {
        await db.delete(timeEntriesTable)
          .where(eq(timeEntriesTable.project_id, projectId))
          .execute();
      }
    }

    // Delete all projects belonging to this customer
    await db.delete(projectsTable)
      .where(eq(projectsTable.customer_id, customerId))
      .execute();

    // Finally, delete the customer itself
    const result = await db.delete(customersTable)
      .where(eq(customersTable.id, customerId))
      .returning()
      .execute();

    return result.length > 0;
  } catch (error) {
    console.error('Customer deletion failed:', error);
    throw error;
  }
}