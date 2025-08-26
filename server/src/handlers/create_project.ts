import { db } from '../db';
import { projectsTable, subscriptionsTable, customersTable, organizationsTable } from '../db/schema';
import { type CreateProjectInput, type Project } from '../schema';
import { eq, and, count } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function createProject(input: CreateProjectInput, createdBy: string): Promise<Project> {
  try {
    // Verify that the organization exists first
    const organization = await db.select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, input.organization_id))
      .execute();

    if (organization.length === 0) {
      throw new Error('Organization not found');
    }

    // Verify that the customer exists and belongs to the organization
    const customer = await db.select()
      .from(customersTable)
      .where(and(
        eq(customersTable.id, input.customer_id),
        eq(customersTable.organization_id, input.organization_id)
      ))
      .execute();

    if (customer.length === 0) {
      throw new Error('Customer not found or does not belong to the specified organization');
    }

    // Get the organization owner's subscription to check limits
    const subscription = await db.select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.user_id, organization[0].owner_id))
      .execute();

    if (subscription.length === 0) {
      throw new Error('No subscription found for organization owner');
    }

    // Check subscription status
    if (subscription[0].status !== 'active') {
      throw new Error('Subscription is not active');
    }

    // Check project limits
    const projectCount = await db.select({ count: count() })
      .from(projectsTable)
      .where(eq(projectsTable.organization_id, input.organization_id))
      .execute();

    if (projectCount[0].count >= subscription[0].max_projects) {
      throw new Error('Project limit exceeded for current subscription');
    }

    // Generate unique ID for the project
    const projectId = nanoid();

    // Insert the project
    const result = await db.insert(projectsTable)
      .values({
        id: projectId,
        name: input.name,
        description: input.description || null,
        customer_id: input.customer_id,
        organization_id: input.organization_id,
        created_by: createdBy,
        is_active: true
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Project creation failed:', error);
    throw error;
  }
}