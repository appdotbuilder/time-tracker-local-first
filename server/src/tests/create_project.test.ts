import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, subscriptionsTable, customersTable, projectsTable } from '../db/schema';
import { type CreateProjectInput } from '../schema';
import { createProject } from '../handlers/create_project';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Test data setup
const testUser = {
  id: nanoid(),
  email: 'test@example.com',
  name: 'Test User'
};

const testOrganization = {
  id: nanoid(),
  name: 'Test Organization',
  owner_id: testUser.id
};

const testSubscription = {
  id: nanoid(),
  user_id: testUser.id,
  plan: 'pro' as const,
  status: 'active' as const,
  max_customers: 10,
  max_projects: 5
};

const testCustomer = {
  id: nanoid(),
  name: 'Test Customer',
  email: 'customer@example.com',
  phone: null,
  address: null,
  organization_id: testOrganization.id,
  created_by: testUser.id
};

const testInput: CreateProjectInput = {
  name: 'Test Project',
  description: 'A project for testing',
  customer_id: testCustomer.id,
  organization_id: testOrganization.id
};

const anotherUser = {
  id: nanoid(),
  email: 'another@example.com',
  name: 'Another User'
};

describe('createProject', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a project successfully', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(organizationsTable).values(testOrganization).execute();
    await db.insert(subscriptionsTable).values(testSubscription).execute();
    await db.insert(customersTable).values(testCustomer).execute();

    const result = await createProject(testInput, testUser.id);

    // Basic field validation
    expect(result.name).toEqual('Test Project');
    expect(result.description).toEqual('A project for testing');
    expect(result.customer_id).toEqual(testCustomer.id);
    expect(result.organization_id).toEqual(testOrganization.id);
    expect(result.created_by).toEqual(testUser.id);
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save project to database', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(organizationsTable).values(testOrganization).execute();
    await db.insert(subscriptionsTable).values(testSubscription).execute();
    await db.insert(customersTable).values(testCustomer).execute();

    const result = await createProject(testInput, testUser.id);

    // Query database to verify project was saved
    const projects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, result.id))
      .execute();

    expect(projects).toHaveLength(1);
    expect(projects[0].name).toEqual('Test Project');
    expect(projects[0].description).toEqual('A project for testing');
    expect(projects[0].customer_id).toEqual(testCustomer.id);
    expect(projects[0].organization_id).toEqual(testOrganization.id);
    expect(projects[0].created_by).toEqual(testUser.id);
    expect(projects[0].is_active).toBe(true);
    expect(projects[0].created_at).toBeInstanceOf(Date);
    expect(projects[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create project with null description', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(organizationsTable).values(testOrganization).execute();
    await db.insert(subscriptionsTable).values(testSubscription).execute();
    await db.insert(customersTable).values(testCustomer).execute();

    const inputWithoutDescription: CreateProjectInput = {
      name: 'Project Without Description',
      customer_id: testCustomer.id,
      organization_id: testOrganization.id
    };

    const result = await createProject(inputWithoutDescription, testUser.id);

    expect(result.name).toEqual('Project Without Description');
    expect(result.description).toBeNull();
    expect(result.customer_id).toEqual(testCustomer.id);
    expect(result.organization_id).toEqual(testOrganization.id);
  });

  it('should throw error when customer does not exist', async () => {
    // Create prerequisite data without customer
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(organizationsTable).values(testOrganization).execute();
    await db.insert(subscriptionsTable).values(testSubscription).execute();

    const inputWithInvalidCustomer: CreateProjectInput = {
      ...testInput,
      customer_id: 'non-existent-customer'
    };

    await expect(createProject(inputWithInvalidCustomer, testUser.id))
      .rejects.toThrow(/customer not found/i);
  });

  it('should throw error when customer belongs to different organization', async () => {
    // Create another organization and customer
    const anotherOrg = {
      id: nanoid(),
      name: 'Another Organization',
      owner_id: testUser.id
    };

    const customerInAnotherOrg = {
      ...testCustomer,
      id: nanoid(),
      organization_id: anotherOrg.id
    };

    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(organizationsTable).values([testOrganization, anotherOrg]).execute();
    await db.insert(subscriptionsTable).values(testSubscription).execute();
    await db.insert(customersTable).values(customerInAnotherOrg).execute();

    const inputWithWrongOrgCustomer: CreateProjectInput = {
      ...testInput,
      customer_id: customerInAnotherOrg.id
    };

    await expect(createProject(inputWithWrongOrgCustomer, testUser.id))
      .rejects.toThrow(/customer not found or does not belong to the specified organization/i);
  });

  it('should throw error when organization does not exist', async () => {
    // Create prerequisite data without organization
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(subscriptionsTable).values(testSubscription).execute();

    const inputWithInvalidOrg: CreateProjectInput = {
      ...testInput,
      organization_id: 'non-existent-org'
    };

    await expect(createProject(inputWithInvalidOrg, testUser.id))
      .rejects.toThrow(/organization not found/i);
  });

  it('should throw error when subscription does not exist', async () => {
    // Create prerequisite data without subscription
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(organizationsTable).values(testOrganization).execute();
    await db.insert(customersTable).values(testCustomer).execute();

    await expect(createProject(testInput, testUser.id))
      .rejects.toThrow(/no subscription found for organization owner/i);
  });

  it('should throw error when subscription is not active', async () => {
    // Create inactive subscription
    const inactiveSubscription = {
      ...testSubscription,
      status: 'cancelled' as const
    };

    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(organizationsTable).values(testOrganization).execute();
    await db.insert(subscriptionsTable).values(inactiveSubscription).execute();
    await db.insert(customersTable).values(testCustomer).execute();

    await expect(createProject(testInput, testUser.id))
      .rejects.toThrow(/subscription is not active/i);
  });

  it('should throw error when project limit is exceeded', async () => {
    // Create subscription with low project limit
    const limitedSubscription = {
      ...testSubscription,
      max_projects: 1
    };

    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(organizationsTable).values(testOrganization).execute();
    await db.insert(subscriptionsTable).values(limitedSubscription).execute();
    await db.insert(customersTable).values(testCustomer).execute();

    // Create existing project to reach limit
    const existingProject = {
      id: nanoid(),
      name: 'Existing Project',
      description: null,
      customer_id: testCustomer.id,
      organization_id: testOrganization.id,
      created_by: testUser.id,
      is_active: true
    };

    await db.insert(projectsTable).values(existingProject).execute();

    await expect(createProject(testInput, testUser.id))
      .rejects.toThrow(/project limit exceeded for current subscription/i);
  });

  it('should allow creating project when within limits', async () => {
    // Create subscription with sufficient project limit
    const subscription = {
      ...testSubscription,
      max_projects: 3
    };

    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(organizationsTable).values(testOrganization).execute();
    await db.insert(subscriptionsTable).values(subscription).execute();
    await db.insert(customersTable).values(testCustomer).execute();

    // Create existing projects (2 out of 3 allowed)
    const existingProjects = [
      {
        id: nanoid(),
        name: 'Project 1',
        description: null,
        customer_id: testCustomer.id,
        organization_id: testOrganization.id,
        created_by: testUser.id,
        is_active: true
      },
      {
        id: nanoid(),
        name: 'Project 2',
        description: null,
        customer_id: testCustomer.id,
        organization_id: testOrganization.id,
        created_by: testUser.id,
        is_active: true
      }
    ];

    await db.insert(projectsTable).values(existingProjects).execute();

    // Should be able to create one more project
    const result = await createProject(testInput, testUser.id);

    expect(result.name).toEqual('Test Project');
    expect(result.organization_id).toEqual(testOrganization.id);

    // Verify total project count
    const totalProjects = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.organization_id, testOrganization.id))
      .execute();

    expect(totalProjects).toHaveLength(3);
  });

  it('should create project with different creator than organization owner', async () => {
    // Create another user
    await db.insert(usersTable).values([testUser, anotherUser]).execute();
    await db.insert(organizationsTable).values(testOrganization).execute();
    await db.insert(subscriptionsTable).values(testSubscription).execute();
    await db.insert(customersTable).values(testCustomer).execute();

    const result = await createProject(testInput, anotherUser.id);

    expect(result.created_by).toEqual(anotherUser.id);
    expect(result.organization_id).toEqual(testOrganization.id);

    // Verify in database
    const project = await db.select()
      .from(projectsTable)
      .where(eq(projectsTable.id, result.id))
      .execute();

    expect(project[0].created_by).toEqual(anotherUser.id);
  });
});