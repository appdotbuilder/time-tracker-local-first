import { db } from '../db';
import { customersTable } from '../db/schema';
import { type Customer } from '../schema';
import { eq } from 'drizzle-orm';

export const getCustomer = async (customerId: string): Promise<Customer | null> => {
  try {
    // Query customer by ID
    const results = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customerId))
      .execute();

    // Return null if customer not found
    if (results.length === 0) {
      return null;
    }

    // Return the found customer
    return results[0];
  } catch (error) {
    console.error('Customer retrieval failed:', error);
    throw error;
  }
};