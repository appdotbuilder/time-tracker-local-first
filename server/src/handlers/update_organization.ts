import { db } from '../db';
import { organizationsTable } from '../db/schema';
import { type UpdateOrganizationInput, type Organization } from '../schema';
import { eq } from 'drizzle-orm';

export const updateOrganization = async (input: UpdateOrganizationInput): Promise<Organization> => {
  try {
    // Build update data object with only provided fields
    const updateData: Partial<{
      name: string;
      updated_at: Date;
    }> = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    // Update organization record
    const result = await db.update(organizationsTable)
      .set(updateData)
      .where(eq(organizationsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Organization with id ${input.id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Organization update failed:', error);
    throw error;
  }
};