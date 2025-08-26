import { db } from '../db';
import { customersTable } from '../db/schema';
import { type GetCustomersInput, type Customer } from '../schema';
import { eq } from 'drizzle-orm';

export const getCustomers = async (input: GetCustomersInput): Promise<Customer[]> => {
  try {
    // Query customers for the specified organization
    const results = await db.select()
      .from(customersTable)
      .where(eq(customersTable.organization_id, input.organization_id))
      .execute();

    // Return the results (no numeric conversions needed for customers table)
    return results;
  } catch (error) {
    console.error('Get customers failed:', error);
    throw error;
  }
};