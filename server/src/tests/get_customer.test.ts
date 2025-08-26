import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, customersTable } from '../db/schema';
import { getCustomer } from '../handlers/get_customer';

describe('getCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return customer by ID', async () => {
    // Create prerequisite user and organization
    const userId = 'test-user-1';
    const orgId = 'test-org-1';
    const customerId = 'test-customer-1';

    await db.insert(usersTable).values({
      id: userId,
      email: 'test@example.com',
      name: 'Test User'
    }).execute();

    await db.insert(organizationsTable).values({
      id: orgId,
      name: 'Test Organization',
      owner_id: userId
    }).execute();

    await db.insert(customersTable).values({
      id: customerId,
      name: 'Test Customer',
      email: 'customer@example.com',
      phone: '123-456-7890',
      address: '123 Test Street',
      organization_id: orgId,
      created_by: userId
    }).execute();

    // Test the handler
    const result = await getCustomer(customerId);

    // Validate the result
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(customerId);
    expect(result!.name).toEqual('Test Customer');
    expect(result!.email).toEqual('customer@example.com');
    expect(result!.phone).toEqual('123-456-7890');
    expect(result!.address).toEqual('123 Test Street');
    expect(result!.organization_id).toEqual(orgId);
    expect(result!.created_by).toEqual(userId);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return customer with minimal data', async () => {
    // Create prerequisite user and organization
    const userId = 'test-user-2';
    const orgId = 'test-org-2';
    const customerId = 'test-customer-2';

    await db.insert(usersTable).values({
      id: userId,
      email: 'test2@example.com',
      name: 'Test User 2'
    }).execute();

    await db.insert(organizationsTable).values({
      id: orgId,
      name: 'Test Organization 2',
      owner_id: userId
    }).execute();

    // Create customer with only required fields (nullable fields as null)
    await db.insert(customersTable).values({
      id: customerId,
      name: 'Minimal Customer',
      email: null,
      phone: null,
      address: null,
      organization_id: orgId,
      created_by: userId
    }).execute();

    const result = await getCustomer(customerId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(customerId);
    expect(result!.name).toEqual('Minimal Customer');
    expect(result!.email).toBeNull();
    expect(result!.phone).toBeNull();
    expect(result!.address).toBeNull();
    expect(result!.organization_id).toEqual(orgId);
    expect(result!.created_by).toEqual(userId);
  });

  it('should return null when customer does not exist', async () => {
    const nonExistentId = 'non-existent-customer';
    
    const result = await getCustomer(nonExistentId);

    expect(result).toBeNull();
  });

  it('should return null for empty customer ID', async () => {
    const result = await getCustomer('');

    expect(result).toBeNull();
  });

  it('should handle multiple customers and return correct one', async () => {
    // Create prerequisite user and organization
    const userId = 'test-user-3';
    const orgId = 'test-org-3';

    await db.insert(usersTable).values({
      id: userId,
      email: 'test3@example.com',
      name: 'Test User 3'
    }).execute();

    await db.insert(organizationsTable).values({
      id: orgId,
      name: 'Test Organization 3',
      owner_id: userId
    }).execute();

    // Create multiple customers
    const customers = [
      {
        id: 'customer-1',
        name: 'Customer One',
        email: 'customer1@example.com',
        organization_id: orgId,
        created_by: userId
      },
      {
        id: 'customer-2',
        name: 'Customer Two',
        email: 'customer2@example.com',
        organization_id: orgId,
        created_by: userId
      },
      {
        id: 'customer-3',
        name: 'Customer Three',
        email: 'customer3@example.com',
        organization_id: orgId,
        created_by: userId
      }
    ];

    await db.insert(customersTable).values(customers).execute();

    // Test getting specific customer
    const result = await getCustomer('customer-2');

    expect(result).not.toBeNull();
    expect(result!.id).toEqual('customer-2');
    expect(result!.name).toEqual('Customer Two');
    expect(result!.email).toEqual('customer2@example.com');
  });
});