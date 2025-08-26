import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, customersTable, projectsTable, timeEntriesTable } from '../db/schema';
import { deleteCustomer } from '../handlers/delete_customer';
import { eq } from 'drizzle-orm';

describe('deleteCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();

    // Create organization
    const [organization] = await db.insert(organizationsTable)
      .values({
        id: 'org-1',
        name: 'Test Organization',
        owner_id: user.id
      })
      .returning()
      .execute();

    // Create customer
    const [customer] = await db.insert(customersTable)
      .values({
        id: 'customer-1',
        name: 'Test Customer',
        email: 'customer@example.com',
        organization_id: organization.id,
        created_by: user.id
      })
      .returning()
      .execute();

    // Create project
    const [project] = await db.insert(projectsTable)
      .values({
        id: 'project-1',
        name: 'Test Project',
        customer_id: customer.id,
        organization_id: organization.id,
        created_by: user.id
      })
      .returning()
      .execute();

    // Create time entries - one directly linked to customer, one to project
    const [timeEntryDirect] = await db.insert(timeEntriesTable)
      .values({
        id: 'time-entry-1',
        user_id: user.id,
        customer_id: customer.id,
        project_id: null,
        description: 'Direct customer work',
        start_time: new Date(),
        tags: ['customer-work']
      })
      .returning()
      .execute();

    const [timeEntryProject] = await db.insert(timeEntriesTable)
      .values({
        id: 'time-entry-2',
        user_id: user.id,
        customer_id: null,
        project_id: project.id,
        description: 'Project work',
        start_time: new Date(),
        tags: ['project-work']
      })
      .returning()
      .execute();

    return { user, organization, customer, project, timeEntryDirect, timeEntryProject };
  };

  it('should delete customer successfully', async () => {
    const { customer } = await createTestData();

    const result = await deleteCustomer(customer.id);

    expect(result).toBe(true);

    // Verify customer is deleted
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, customer.id))
      .execute();

    expect(customers).toHaveLength(0);
  });

  it('should delete all related projects when deleting customer', async () => {
    const { customer, project } = await createTestData();

    await deleteCustomer(customer.id);

    // Verify project is deleted
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, project.id))
      .execute();

    expect(projects).toHaveLength(0);
  });

  it('should delete all time entries directly linked to customer', async () => {
    const { customer, timeEntryDirect } = await createTestData();

    await deleteCustomer(customer.id);

    // Verify direct time entry is deleted
    const timeEntries = await db.select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, timeEntryDirect.id))
      .execute();

    expect(timeEntries).toHaveLength(0);
  });

  it('should delete all time entries linked to customer projects', async () => {
    const { customer, timeEntryProject } = await createTestData();

    await deleteCustomer(customer.id);

    // Verify project time entry is deleted
    const timeEntries = await db.select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, timeEntryProject.id))
      .execute();

    expect(timeEntries).toHaveLength(0);
  });

  it('should handle complete cascading deletion', async () => {
    const { customer } = await createTestData();

    // Count initial records
    const initialCustomers = await db.select().from(customersTable).execute();
    const initialProjects = await db.select().from(projectsTable).execute();
    const initialTimeEntries = await db.select().from(timeEntriesTable).execute();

    expect(initialCustomers).toHaveLength(1);
    expect(initialProjects).toHaveLength(1);
    expect(initialTimeEntries).toHaveLength(2);

    await deleteCustomer(customer.id);

    // Verify all related records are deleted
    const finalCustomers = await db.select().from(customersTable).execute();
    const finalProjects = await db.select().from(projectsTable).execute();
    const finalTimeEntries = await db.select().from(timeEntriesTable).execute();

    expect(finalCustomers).toHaveLength(0);
    expect(finalProjects).toHaveLength(0);
    expect(finalTimeEntries).toHaveLength(0);
  });

  it('should return false when customer does not exist', async () => {
    const result = await deleteCustomer('non-existent-id');

    expect(result).toBe(false);
  });

  it('should handle customer with multiple projects correctly', async () => {
    const { user, organization, customer } = await createTestData();

    // Create additional projects for the same customer
    await db.insert(projectsTable)
      .values([
        {
          id: 'project-2',
          name: 'Test Project 2',
          customer_id: customer.id,
          organization_id: organization.id,
          created_by: user.id
        },
        {
          id: 'project-3',
          name: 'Test Project 3',
          customer_id: customer.id,
          organization_id: organization.id,
          created_by: user.id
        }
      ])
      .execute();

    // Create time entries for each project
    await db.insert(timeEntriesTable)
      .values([
        {
          id: 'time-entry-3',
          user_id: user.id,
          project_id: 'project-2',
          description: 'Project 2 work',
          start_time: new Date(),
          tags: ['project2']
        },
        {
          id: 'time-entry-4',
          user_id: user.id,
          project_id: 'project-3',
          description: 'Project 3 work',
          start_time: new Date(),
          tags: ['project3']
        }
      ])
      .execute();

    await deleteCustomer(customer.id);

    // Verify all projects are deleted
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.customer_id, customer.id))
      .execute();

    expect(projects).toHaveLength(0);

    // Verify all time entries are deleted
    const timeEntries = await db.select().from(timeEntriesTable).execute();
    expect(timeEntries).toHaveLength(0);
  });

  it('should not affect other customers data', async () => {
    const { user, organization } = await createTestData();

    // Create another customer with its own data
    const [otherCustomer] = await db.insert(customersTable)
      .values({
        id: 'customer-2',
        name: 'Other Customer',
        email: 'other@example.com',
        organization_id: organization.id,
        created_by: user.id
      })
      .returning()
      .execute();

    const [otherProject] = await db.insert(projectsTable)
      .values({
        id: 'project-other',
        name: 'Other Project',
        customer_id: otherCustomer.id,
        organization_id: organization.id,
        created_by: user.id
      })
      .returning()
      .execute();

    await db.insert(timeEntriesTable)
      .values({
        id: 'time-entry-other',
        user_id: user.id,
        customer_id: otherCustomer.id,
        description: 'Other customer work',
        start_time: new Date(),
        tags: ['other-work']
      })
      .execute();

    // Delete first customer
    await deleteCustomer('customer-1');

    // Verify other customer's data is preserved
    const otherCustomers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, otherCustomer.id))
      .execute();

    const otherProjects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, otherProject.id))
      .execute();

    const otherTimeEntries = await db.select()
      .from(timeEntriesTable)
      .where(eq(timeEntriesTable.id, 'time-entry-other'))
      .execute();

    expect(otherCustomers).toHaveLength(1);
    expect(otherProjects).toHaveLength(1);
    expect(otherTimeEntries).toHaveLength(1);
  });
});