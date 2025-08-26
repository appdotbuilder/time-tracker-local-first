import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, customersTable, projectsTable } from '../db/schema';
import { type GetProjectsInput } from '../schema';
import { getProjects } from '../handlers/get_projects';

// Test data
const testUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User'
};

const testOrganization = {
  id: 'org-1',
  name: 'Test Organization',
  owner_id: 'user-1'
};

const testCustomer1 = {
  id: 'customer-1',
  name: 'Customer One',
  email: 'customer1@example.com',
  organization_id: 'org-1',
  created_by: 'user-1'
};

const testCustomer2 = {
  id: 'customer-2',
  name: 'Customer Two',
  email: 'customer2@example.com',
  organization_id: 'org-1',
  created_by: 'user-1'
};

const testProject1 = {
  id: 'project-1',
  name: 'Project One',
  description: 'First test project',
  customer_id: 'customer-1',
  organization_id: 'org-1',
  created_by: 'user-1',
  is_active: true
};

const testProject2 = {
  id: 'project-2',
  name: 'Project Two',
  description: null,
  customer_id: 'customer-2',
  organization_id: 'org-1',
  created_by: 'user-1',
  is_active: true
};

const testProject3 = {
  id: 'project-3',
  name: 'Project Three',
  description: 'Third test project',
  customer_id: 'customer-1',
  organization_id: 'org-1',
  created_by: 'user-1',
  is_active: false
};

describe('getProjects', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get all projects for an organization', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(organizationsTable).values(testOrganization).execute();
    await db.insert(customersTable).values([testCustomer1, testCustomer2]).execute();
    await db.insert(projectsTable).values([testProject1, testProject2, testProject3]).execute();

    const input: GetProjectsInput = {
      organization_id: 'org-1'
    };

    const result = await getProjects(input);

    expect(result).toHaveLength(3);
    
    // Verify all projects are from the correct organization
    result.forEach(project => {
      expect(project.organization_id).toEqual('org-1');
    });

    // Verify specific projects exist
    const projectNames = result.map(p => p.name).sort();
    expect(projectNames).toEqual(['Project One', 'Project Three', 'Project Two']);
  });

  it('should filter projects by customer_id', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(organizationsTable).values(testOrganization).execute();
    await db.insert(customersTable).values([testCustomer1, testCustomer2]).execute();
    await db.insert(projectsTable).values([testProject1, testProject2, testProject3]).execute();

    const input: GetProjectsInput = {
      organization_id: 'org-1',
      customer_id: 'customer-1'
    };

    const result = await getProjects(input);

    expect(result).toHaveLength(2);
    
    // All projects should be for customer-1
    result.forEach(project => {
      expect(project.customer_id).toEqual('customer-1');
      expect(project.organization_id).toEqual('org-1');
    });

    // Verify specific projects
    const projectNames = result.map(p => p.name).sort();
    expect(projectNames).toEqual(['Project One', 'Project Three']);
  });

  it('should return empty array for non-existent organization', async () => {
    const input: GetProjectsInput = {
      organization_id: 'non-existent-org'
    };

    const result = await getProjects(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-existent customer', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(organizationsTable).values(testOrganization).execute();
    await db.insert(customersTable).values([testCustomer1, testCustomer2]).execute();
    await db.insert(projectsTable).values([testProject1, testProject2, testProject3]).execute();

    const input: GetProjectsInput = {
      organization_id: 'org-1',
      customer_id: 'non-existent-customer'
    };

    const result = await getProjects(input);

    expect(result).toHaveLength(0);
  });

  it('should return projects with correct structure and types', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(organizationsTable).values(testOrganization).execute();
    await db.insert(customersTable).values([testCustomer1]).execute();
    await db.insert(projectsTable).values([testProject1]).execute();

    const input: GetProjectsInput = {
      organization_id: 'org-1'
    };

    const result = await getProjects(input);

    expect(result).toHaveLength(1);
    
    const project = result[0];
    expect(project.id).toEqual('project-1');
    expect(project.name).toEqual('Project One');
    expect(project.description).toEqual('First test project');
    expect(project.customer_id).toEqual('customer-1');
    expect(project.organization_id).toEqual('org-1');
    expect(project.created_by).toEqual('user-1');
    expect(project.is_active).toEqual(true);
    expect(project.created_at).toBeInstanceOf(Date);
    expect(project.updated_at).toBeInstanceOf(Date);
  });
});