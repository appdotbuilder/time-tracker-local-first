import { db } from '../db';
import { organizationsTable, usersTable } from '../db/schema';
import { type CreateOrganizationInput, type Organization } from '../schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const createOrganization = async (input: CreateOrganizationInput): Promise<Organization> => {
  try {
    // Verify that the owner user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.owner_id))
      .limit(1)
      .execute();

    if (existingUser.length === 0) {
      throw new Error(`User with id ${input.owner_id} not found`);
    }

    // Insert organization record
    const result = await db.insert(organizationsTable)
      .values({
        id: nanoid(),
        name: input.name,
        owner_id: input.owner_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Organization creation failed:', error);
    throw error;
  }
};