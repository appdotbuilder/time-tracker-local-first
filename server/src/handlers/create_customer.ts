import { db } from '../db';
import { customersTable, subscriptionsTable, organizationsTable } from '../db/schema';
import { type CreateCustomerInput, type Customer } from '../schema';
import { eq, and, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export async function createCustomer(input: CreateCustomerInput, createdBy: string): Promise<Customer> {
  try {
    // First, verify the organization exists and get the owner
    const organization = await db
      .select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, input.organization_id))
      .limit(1)
      .execute();

    if (organization.length === 0) {
      throw new Error('Organization not found');
    }

    // Get the user's subscription to check limits
    const subscription = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.user_id, organization[0].owner_id))
      .limit(1)
      .execute();

    if (subscription.length === 0) {
      throw new Error('No subscription found for organization owner');
    }

    // Check if subscription is active
    if (subscription[0].status !== 'active') {
      throw new Error('Subscription is not active');
    }

    // Count existing customers for the organization
    const customerCount = await db
      .select({ count: count() })
      .from(customersTable)
      .where(eq(customersTable.organization_id, input.organization_id))
      .execute();

    const existingCustomers = customerCount[0].count;

    // Check subscription limit
    if (existingCustomers >= subscription[0].max_customers) {
      throw new Error(`Customer limit reached. Maximum ${subscription[0].max_customers} customers allowed for ${subscription[0].plan} plan`);
    }

    // Create the customer
    const customerId = randomUUID();
    const result = await db
      .insert(customersTable)
      .values({
        id: customerId,
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        address: input.address || null,
        organization_id: input.organization_id,
        created_by: createdBy
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Customer creation failed:', error);
    throw error;
  }
}