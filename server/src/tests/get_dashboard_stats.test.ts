import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, customersTable, projectsTable, timeEntriesTable } from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

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

const testCustomer = {
  id: 'customer-1',
  name: 'Test Customer',
  email: 'customer@example.com',
  organization_id: 'org-1',
  created_by: 'user-1'
};

const testCustomer2 = {
  id: 'customer-2',
  name: 'Second Customer',
  email: 'customer2@example.com',
  organization_id: 'org-1',
  created_by: 'user-1'
};

const testProject = {
  id: 'project-1',
  name: 'Test Project',
  description: 'A test project',
  customer_id: 'customer-1',
  organization_id: 'org-1',
  created_by: 'user-1',
  is_active: true
};

const testProject2 = {
  id: 'project-2',
  name: 'Second Project',
  description: 'Another test project',
  customer_id: 'customer-2',
  organization_id: 'org-1',
  created_by: 'user-1',
  is_active: true
};

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  async function createTestData() {
    // Create user
    await db.insert(usersTable).values(testUser).execute();

    // Create organization
    await db.insert(organizationsTable).values(testOrganization).execute();

    // Create customers
    await db.insert(customersTable).values([testCustomer, testCustomer2]).execute();

    // Create projects
    await db.insert(projectsTable).values([testProject, testProject2]).execute();
  }

  it('should return empty stats when no data exists', async () => {
    await createTestData();

    const result = await getDashboardStats('user-1', 'org-1');

    expect(result.totalTimeToday).toEqual(0);
    expect(result.totalTimeThisWeek).toEqual(0);
    expect(result.totalTimeThisMonth).toEqual(0);
    expect(result.totalCustomers).toEqual(2);
    expect(result.totalProjects).toEqual(2);
    expect(result.recentEntries).toHaveLength(0);
    expect(result.topCustomersByTime).toHaveLength(0);
    expect(result.topProjectsByTime).toHaveLength(0);
  });

  it('should calculate time stats correctly', async () => {
    await createTestData();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 8);

    // Time entries for today
    await db.insert(timeEntriesTable).values([
      {
        id: 'entry-1',
        user_id: 'user-1',
        customer_id: 'customer-1',
        project_id: 'project-1',
        description: 'Today work',
        start_time: today,
        end_time: new Date(today.getTime() + 2 * 60 * 60 * 1000), // 2 hours later
        duration_minutes: 120,
        tags: ['work']
      },
      {
        id: 'entry-2',
        user_id: 'user-1',
        customer_id: 'customer-2',
        project_id: 'project-2',
        description: 'More today work',
        start_time: new Date(today.getTime() + 3 * 60 * 60 * 1000),
        end_time: new Date(today.getTime() + 4 * 60 * 60 * 1000), // 1 hour
        duration_minutes: 60,
        tags: ['work']
      }
    ]).execute();

    // Time entry from yesterday (should count for week and month)
    await db.insert(timeEntriesTable).values({
      id: 'entry-3',
      user_id: 'user-1',
      customer_id: 'customer-1',
      project_id: 'project-1',
      description: 'Yesterday work',
      start_time: yesterday,
      end_time: new Date(yesterday.getTime() + 3 * 60 * 60 * 1000), // 3 hours
      duration_minutes: 180,
      tags: ['work']
    }).execute();

    // Time entry from last week (should only count for month)
    await db.insert(timeEntriesTable).values({
      id: 'entry-4',
      user_id: 'user-1',
      customer_id: 'customer-2',
      project_id: 'project-2',
      description: 'Last week work',
      start_time: lastWeek,
      end_time: new Date(lastWeek.getTime() + 4 * 60 * 60 * 1000), // 4 hours
      duration_minutes: 240,
      tags: ['work']
    }).execute();

    const result = await getDashboardStats('user-1', 'org-1');

    expect(result.totalTimeToday).toEqual(180); // 120 + 60
    expect(result.totalTimeThisWeek).toEqual(360); // 120 + 60 + 180
    expect(result.totalTimeThisMonth).toEqual(600); // 120 + 60 + 180 + 240
    expect(result.totalCustomers).toEqual(2);
    expect(result.totalProjects).toEqual(2);
    expect(result.recentEntries).toHaveLength(4);
  });

  it('should return recent entries in correct order', async () => {
    await createTestData();

    const now = new Date();
    const earlier = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour earlier
    const evenEarlier = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours earlier

    await db.insert(timeEntriesTable).values([
      {
        id: 'entry-1',
        user_id: 'user-1',
        customer_id: 'customer-1',
        project_id: 'project-1',
        description: 'Latest entry',
        start_time: now,
        end_time: null,
        duration_minutes: null,
        tags: ['latest']
      },
      {
        id: 'entry-2',
        user_id: 'user-1',
        customer_id: 'customer-1',
        project_id: 'project-1',
        description: 'Earlier entry',
        start_time: earlier,
        end_time: null,
        duration_minutes: null,
        tags: ['earlier']
      },
      {
        id: 'entry-3',
        user_id: 'user-1',
        customer_id: 'customer-1',
        project_id: 'project-1',
        description: 'Even earlier entry',
        start_time: evenEarlier,
        end_time: null,
        duration_minutes: null,
        tags: ['earliest']
      }
    ]).execute();

    const result = await getDashboardStats('user-1', 'org-1');

    expect(result.recentEntries).toHaveLength(3);
    expect(result.recentEntries[0].description).toEqual('Latest entry');
    expect(result.recentEntries[1].description).toEqual('Earlier entry');
    expect(result.recentEntries[2].description).toEqual('Even earlier entry');
    expect(result.recentEntries[0].tags).toEqual(['latest']);
  });

  it('should calculate top customers by time correctly', async () => {
    await createTestData();

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Time entries for this month
    await db.insert(timeEntriesTable).values([
      {
        id: 'entry-1',
        user_id: 'user-1',
        customer_id: 'customer-1',
        project_id: 'project-1',
        description: 'Customer 1 work',
        start_time: thisMonth,
        end_time: new Date(thisMonth.getTime() + 5 * 60 * 60 * 1000), // 5 hours
        duration_minutes: 300,
        tags: []
      },
      {
        id: 'entry-2',
        user_id: 'user-1',
        customer_id: 'customer-2',
        project_id: 'project-2',
        description: 'Customer 2 work',
        start_time: thisMonth,
        end_time: new Date(thisMonth.getTime() + 2 * 60 * 60 * 1000), // 2 hours
        duration_minutes: 120,
        tags: []
      },
      {
        id: 'entry-3',
        user_id: 'user-1',
        customer_id: 'customer-1',
        project_id: 'project-1',
        description: 'More Customer 1 work',
        start_time: new Date(thisMonth.getTime() + 24 * 60 * 60 * 1000), // Next day
        end_time: new Date(thisMonth.getTime() + 27 * 60 * 60 * 1000), // 3 more hours
        duration_minutes: 180,
        tags: []
      }
    ]).execute();

    const result = await getDashboardStats('user-1', 'org-1');

    expect(result.topCustomersByTime).toHaveLength(2);
    expect(result.topCustomersByTime[0]).toEqual({
      customer_id: 'customer-1',
      customer_name: 'Test Customer',
      total_minutes: 480 // 300 + 180
    });
    expect(result.topCustomersByTime[1]).toEqual({
      customer_id: 'customer-2',
      customer_name: 'Second Customer',
      total_minutes: 120
    });
  });

  it('should calculate top projects by time correctly', async () => {
    await createTestData();

    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Time entries for this month
    await db.insert(timeEntriesTable).values([
      {
        id: 'entry-1',
        user_id: 'user-1',
        customer_id: 'customer-1',
        project_id: 'project-1',
        description: 'Project 1 work',
        start_time: thisMonth,
        end_time: new Date(thisMonth.getTime() + 6 * 60 * 60 * 1000), // 6 hours
        duration_minutes: 360,
        tags: []
      },
      {
        id: 'entry-2',
        user_id: 'user-1',
        customer_id: 'customer-2',
        project_id: 'project-2',
        description: 'Project 2 work',
        start_time: thisMonth,
        end_time: new Date(thisMonth.getTime() + 3 * 60 * 60 * 1000), // 3 hours
        duration_minutes: 180,
        tags: []
      },
      {
        id: 'entry-3',
        user_id: 'user-1',
        customer_id: 'customer-1',
        project_id: 'project-1',
        description: 'More Project 1 work',
        start_time: new Date(thisMonth.getTime() + 24 * 60 * 60 * 1000), // Next day
        end_time: new Date(thisMonth.getTime() + 26 * 60 * 60 * 1000), // 2 more hours
        duration_minutes: 120,
        tags: []
      }
    ]).execute();

    const result = await getDashboardStats('user-1', 'org-1');

    expect(result.topProjectsByTime).toHaveLength(2);
    expect(result.topProjectsByTime[0]).toEqual({
      project_id: 'project-1',
      project_name: 'Test Project',
      total_minutes: 480 // 360 + 120
    });
    expect(result.topProjectsByTime[1]).toEqual({
      project_id: 'project-2',
      project_name: 'Second Project',
      total_minutes: 180
    });
  });

  it('should only include data for the specified user and organization', async () => {
    await createTestData();

    // Create another user and organization
    await db.insert(usersTable).values({
      id: 'user-2',
      email: 'other@example.com',
      name: 'Other User'
    }).execute();

    await db.insert(organizationsTable).values({
      id: 'org-2',
      name: 'Other Organization',
      owner_id: 'user-2'
    }).execute();

    await db.insert(customersTable).values({
      id: 'customer-3',
      name: 'Other Customer',
      email: 'other-customer@example.com',
      organization_id: 'org-2',
      created_by: 'user-2'
    }).execute();

    const now = new Date();

    // Create time entries for different users
    await db.insert(timeEntriesTable).values([
      {
        id: 'entry-1',
        user_id: 'user-1',
        customer_id: 'customer-1',
        project_id: 'project-1',
        description: 'User 1 work',
        start_time: now,
        end_time: new Date(now.getTime() + 60 * 60 * 1000),
        duration_minutes: 60,
        tags: []
      },
      {
        id: 'entry-2',
        user_id: 'user-2',
        customer_id: 'customer-3',
        project_id: null,
        description: 'User 2 work',
        start_time: now,
        end_time: new Date(now.getTime() + 120 * 60 * 1000),
        duration_minutes: 120,
        tags: []
      }
    ]).execute();

    const result = await getDashboardStats('user-1', 'org-1');

    // Should only count data for user-1 and org-1
    expect(result.totalTimeToday).toEqual(60);
    expect(result.totalCustomers).toEqual(2); // Only customers in org-1
    expect(result.totalProjects).toEqual(2); // Only projects in org-1
    expect(result.recentEntries).toHaveLength(1);
    expect(result.recentEntries[0].user_id).toEqual('user-1');
  });

  it('should handle entries without duration_minutes', async () => {
    await createTestData();

    const now = new Date();

    // Create time entries with and without duration
    await db.insert(timeEntriesTable).values([
      {
        id: 'entry-1',
        user_id: 'user-1',
        customer_id: 'customer-1',
        project_id: 'project-1',
        description: 'Work with duration',
        start_time: now,
        end_time: new Date(now.getTime() + 60 * 60 * 1000),
        duration_minutes: 60,
        tags: []
      },
      {
        id: 'entry-2',
        user_id: 'user-1',
        customer_id: 'customer-1',
        project_id: 'project-1',
        description: 'Work without duration',
        start_time: now,
        end_time: null,
        duration_minutes: null,
        tags: []
      }
    ]).execute();

    const result = await getDashboardStats('user-1', 'org-1');

    // Should only count entries with duration_minutes
    expect(result.totalTimeToday).toEqual(60);
    expect(result.recentEntries).toHaveLength(2); // But recent entries should include all
  });
});