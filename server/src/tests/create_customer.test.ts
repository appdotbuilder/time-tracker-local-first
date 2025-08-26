import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, subscriptionsTable, customersTable } from '../db/schema';
import { type CreateCustomerInput } from '../schema';
import { createCustomer } from '../handlers/create_customer';
import { eq, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Test data
const testUser = {
  id: 'user-1',
  email: 'owner@example.com',
  name: 'Test Owner'
};

const testOrganization = {
  id: 'org-1',
  name: 'Test Organization',
  owner_id: testUser.id
};

const testSubscription = {
  id: 'sub-1',
  user_id: testUser.id,
  plan: 'free' as const,
  status: 'active' as const,
  max_customers: 3,
  max_projects: 3
};

const testInput: CreateCustomerInput = {
  name: 'Test Customer',
  email: 'customer@example.com',
  phone: '+1234567890',
  address: '123 Test St',
  organization_id: testOrganization.id
};

describe('createCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a customer successfully', async () => {
    // Setup prerequisites
    await db.insert(usersTable).values(testUser);
    await db.insert(organizationsTable).values(testOrganization);
    await db.insert(subscriptionsTable).values(testSubscription);

    const result = await createCustomer(testInput, testUser.id);

    // Verify returned data
    expect(result.name).toEqual('Test Customer');
    expect(result.email).toEqual('customer@example.com');
    expect(result.phone).toEqual('+1234567890');
    expect(result.address).toEqual('123 Test St');
    expect(result.organization_id).toEqual(testOrganization.id);
    expect(result.created_by).toEqual(testUser.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save customer to database', async () => {
    // Setup prerequisites
    await db.insert(usersTable).values(testUser);
    await db.insert(organizationsTable).values(testOrganization);
    await db.insert(subscriptionsTable).values(testSubscription);

    const result = await createCustomer(testInput, testUser.id);

    // Verify in database
    const customers = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, result.id))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('Test Customer');
    expect(customers[0].email).toEqual('customer@example.com');
    expect(customers[0].organization_id).toEqual(testOrganization.id);
  });

  it('should create customer with minimal data', async () => {
    // Setup prerequisites
    await db.insert(usersTable).values(testUser);
    await db.insert(organizationsTable).values(testOrganization);
    await db.insert(subscriptionsTable).values(testSubscription);

    const minimalInput: CreateCustomerInput = {
      name: 'Minimal Customer',
      organization_id: testOrganization.id
    };

    const result = await createCustomer(minimalInput, testUser.id);

    expect(result.name).toEqual('Minimal Customer');
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
    expect(result.address).toBeNull();
    expect(result.organization_id).toEqual(testOrganization.id);
  });

  it('should throw error when organization not found', async () => {
    const invalidInput: CreateCustomerInput = {
      name: 'Test Customer',
      organization_id: 'nonexistent-org'
    };

    await expect(createCustomer(invalidInput, testUser.id)).rejects.toThrow(/organization not found/i);
  });

  it('should throw error when no subscription exists', async () => {
    // Create organization but no subscription
    await db.insert(usersTable).values(testUser);
    await db.insert(organizationsTable).values(testOrganization);

    await expect(createCustomer(testInput, testUser.id)).rejects.toThrow(/no subscription found/i);
  });

  it('should throw error when subscription is not active', async () => {
    // Setup with inactive subscription
    await db.insert(usersTable).values(testUser);
    await db.insert(organizationsTable).values(testOrganization);
    await db.insert(subscriptionsTable).values({
      ...testSubscription,
      status: 'cancelled'
    });

    await expect(createCustomer(testInput, testUser.id)).rejects.toThrow(/subscription is not active/i);
  });

  it('should throw error when customer limit is reached', async () => {
    // Setup with subscription that has max 1 customer
    await db.insert(usersTable).values(testUser);
    await db.insert(organizationsTable).values(testOrganization);
    await db.insert(subscriptionsTable).values({
      ...testSubscription,
      max_customers: 1
    });

    // Create first customer
    await db.insert(customersTable).values({
      id: randomUUID(),
      name: 'Existing Customer',
      email: null,
      phone: null,
      address: null,
      organization_id: testOrganization.id,
      created_by: testUser.id
    });

    await expect(createCustomer(testInput, testUser.id)).rejects.toThrow(/customer limit reached/i);
  });

  it('should allow creating customer when under limit', async () => {
    // Setup with subscription that allows 3 customers
    await db.insert(usersTable).values(testUser);
    await db.insert(organizationsTable).values(testOrganization);
    await db.insert(subscriptionsTable).values({
      ...testSubscription,
      max_customers: 3
    });

    // Create 2 existing customers
    await db.insert(customersTable).values([
      {
        id: randomUUID(),
        name: 'Customer 1',
        email: null,
        phone: null,
        address: null,
        organization_id: testOrganization.id,
        created_by: testUser.id
      },
      {
        id: randomUUID(),
        name: 'Customer 2',
        email: null,
        phone: null,
        address: null,
        organization_id: testOrganization.id,
        created_by: testUser.id
      }
    ]);

    // Should still be able to create third customer
    const result = await createCustomer(testInput, testUser.id);
    expect(result.name).toEqual('Test Customer');

    // Verify total count
    const totalCustomers = await db
      .select({ count: count() })
      .from(customersTable)
      .where(eq(customersTable.organization_id, testOrganization.id))
      .execute();

    expect(totalCustomers[0].count).toEqual(3);
  });

  it('should handle different subscription plans correctly', async () => {
    // Test with pro subscription (higher limits)
    await db.insert(usersTable).values(testUser);
    await db.insert(organizationsTable).values(testOrganization);
    await db.insert(subscriptionsTable).values({
      ...testSubscription,
      plan: 'pro',
      max_customers: 10
    });

    const result = await createCustomer(testInput, testUser.id);
    expect(result.name).toEqual('Test Customer');
  });

  it('should create customers for different organizations independently', async () => {
    // Setup two organizations with different owners
    const user2 = { id: 'user-2', email: 'owner2@example.com', name: 'Owner 2' };
    const org2 = { id: 'org-2', name: 'Organization 2', owner_id: user2.id };
    const sub2 = { id: 'sub-2', user_id: user2.id, plan: 'free' as const, status: 'active' as const, max_customers: 3, max_projects: 3 };

    await db.insert(usersTable).values([testUser, user2]);
    await db.insert(organizationsTable).values([testOrganization, org2]);
    await db.insert(subscriptionsTable).values([testSubscription, sub2]);

    // Create customer in first organization
    const customer1 = await createCustomer(testInput, testUser.id);
    
    // Create customer in second organization
    const input2: CreateCustomerInput = {
      name: 'Customer Org 2',
      organization_id: org2.id
    };
    const customer2 = await createCustomer(input2, user2.id);

    expect(customer1.organization_id).toEqual(testOrganization.id);
    expect(customer2.organization_id).toEqual(org2.id);
    expect(customer1.id).not.toEqual(customer2.id);
  });
});