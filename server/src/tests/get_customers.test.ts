import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, customersTable } from '../db/schema';
import { type GetCustomersInput } from '../schema';
import { getCustomers } from '../handlers/get_customers';
import { eq } from 'drizzle-orm';

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

const testCustomers = [
  {
    id: 'customer-1',
    name: 'Customer One',
    email: 'customer1@example.com',
    phone: '+1234567890',
    address: '123 Main St',
    organization_id: 'org-1',
    created_by: 'user-1'
  },
  {
    id: 'customer-2',
    name: 'Customer Two',
    email: null,
    phone: null,
    address: null,
    organization_id: 'org-1',
    created_by: 'user-1'
  }
];

const testInput: GetCustomersInput = {
  organization_id: 'org-1'
};

describe('getCustomers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return customers for an organization', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser);
    await db.insert(organizationsTable).values(testOrganization);
    await db.insert(customersTable).values(testCustomers);

    const result = await getCustomers(testInput);

    // Should return both customers
    expect(result).toHaveLength(2);
    
    // Verify customer data
    const customer1 = result.find(c => c.id === 'customer-1');
    const customer2 = result.find(c => c.id === 'customer-2');

    expect(customer1).toBeDefined();
    expect(customer1!.name).toEqual('Customer One');
    expect(customer1!.email).toEqual('customer1@example.com');
    expect(customer1!.phone).toEqual('+1234567890');
    expect(customer1!.address).toEqual('123 Main St');
    expect(customer1!.organization_id).toEqual('org-1');
    expect(customer1!.created_by).toEqual('user-1');
    expect(customer1!.created_at).toBeInstanceOf(Date);
    expect(customer1!.updated_at).toBeInstanceOf(Date);

    expect(customer2).toBeDefined();
    expect(customer2!.name).toEqual('Customer Two');
    expect(customer2!.email).toBeNull();
    expect(customer2!.phone).toBeNull();
    expect(customer2!.address).toBeNull();
    expect(customer2!.organization_id).toEqual('org-1');
  });

  it('should return empty array when organization has no customers', async () => {
    // Create prerequisite data but no customers
    await db.insert(usersTable).values(testUser);
    await db.insert(organizationsTable).values(testOrganization);

    const result = await getCustomers(testInput);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array for non-existent organization', async () => {
    const nonExistentInput: GetCustomersInput = {
      organization_id: 'non-existent-org'
    };

    const result = await getCustomers(nonExistentInput);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should only return customers for specified organization', async () => {
    // Create additional test data for different organization
    const otherUser = { id: 'user-2', email: 'other@example.com', name: 'Other User' };
    const otherOrg = { id: 'org-2', name: 'Other Organization', owner_id: 'user-2' };
    const otherCustomer = {
      id: 'customer-3',
      name: 'Other Customer',
      email: 'other@customer.com',
      phone: null,
      address: null,
      organization_id: 'org-2',
      created_by: 'user-2'
    };

    // Insert all test data
    await db.insert(usersTable).values([testUser, otherUser]);
    await db.insert(organizationsTable).values([testOrganization, otherOrg]);
    await db.insert(customersTable).values([...testCustomers, otherCustomer]);

    const result = await getCustomers(testInput);

    // Should only return customers from org-1, not org-2
    expect(result).toHaveLength(2);
    result.forEach(customer => {
      expect(customer.organization_id).toEqual('org-1');
    });

    // Verify none of the returned customers are from the other organization
    const customerIds = result.map(c => c.id);
    expect(customerIds).not.toContain('customer-3');
  });

  it('should preserve customer data ordering', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser);
    await db.insert(organizationsTable).values(testOrganization);
    await db.insert(customersTable).values(testCustomers);

    const result = await getCustomers(testInput);

    expect(result).toHaveLength(2);
    
    // Verify all expected customers are present
    const customerIds = result.map(c => c.id);
    expect(customerIds).toContain('customer-1');
    expect(customerIds).toContain('customer-2');
  });

  it('should handle customers with all fields populated', async () => {
    const fullCustomer = {
      id: 'customer-full',
      name: 'Full Customer',
      email: 'full@customer.com',
      phone: '+1987654321',
      address: '456 Oak Avenue, Suite 100',
      organization_id: 'org-1',
      created_by: 'user-1'
    };

    // Create prerequisite data
    await db.insert(usersTable).values(testUser);
    await db.insert(organizationsTable).values(testOrganization);
    await db.insert(customersTable).values(fullCustomer);

    const result = await getCustomers(testInput);

    expect(result).toHaveLength(1);
    const customer = result[0];
    
    expect(customer.id).toEqual('customer-full');
    expect(customer.name).toEqual('Full Customer');
    expect(customer.email).toEqual('full@customer.com');
    expect(customer.phone).toEqual('+1987654321');
    expect(customer.address).toEqual('456 Oak Avenue, Suite 100');
    expect(customer.organization_id).toEqual('org-1');
    expect(customer.created_by).toEqual('user-1');
    expect(customer.created_at).toBeInstanceOf(Date);
    expect(customer.updated_at).toBeInstanceOf(Date);
  });
});