import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable, customersTable } from '../db/schema';
import { type UpdateCustomerInput } from '../schema';
import { updateCustomer } from '../handlers/update_customer';
import { eq } from 'drizzle-orm';

describe('updateCustomer', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: string;
  let testOrgId: string;
  let testCustomerId: string;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        id: 'test-user-1',
        email: 'test@example.com',
        name: 'Test User'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        id: 'test-org-1',
        name: 'Test Organization',
        owner_id: testUserId
      })
      .returning()
      .execute();
    testOrgId = orgResult[0].id;

    // Create test customer
    const customerResult = await db.insert(customersTable)
      .values({
        id: 'test-customer-1',
        name: 'Original Customer Name',
        email: 'original@example.com',
        phone: '555-0123',
        address: '123 Original St',
        organization_id: testOrgId,
        created_by: testUserId
      })
      .returning()
      .execute();
    testCustomerId = customerResult[0].id;
  });

  it('should update customer name', async () => {
    const updateInput: UpdateCustomerInput = {
      id: testCustomerId,
      name: 'Updated Customer Name'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(testCustomerId);
    expect(result.name).toEqual('Updated Customer Name');
    expect(result.email).toEqual('original@example.com'); // Should remain unchanged
    expect(result.phone).toEqual('555-0123'); // Should remain unchanged
    expect(result.address).toEqual('123 Original St'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update customer email', async () => {
    const updateInput: UpdateCustomerInput = {
      id: testCustomerId,
      email: 'updated@example.com'
    };

    const result = await updateCustomer(updateInput);

    expect(result.id).toEqual(testCustomerId);
    expect(result.name).toEqual('Original Customer Name'); // Should remain unchanged
    expect(result.email).toEqual('updated@example.com');
    expect(result.phone).toEqual('555-0123'); // Should remain unchanged
    expect(result.address).toEqual('123 Original St'); // Should remain unchanged
  });

  it('should update customer phone', async () => {
    const updateInput: UpdateCustomerInput = {
      id: testCustomerId,
      phone: '555-9999'
    };

    const result = await updateCustomer(updateInput);

    expect(result.phone).toEqual('555-9999');
    expect(result.name).toEqual('Original Customer Name'); // Should remain unchanged
  });

  it('should update customer address', async () => {
    const updateInput: UpdateCustomerInput = {
      id: testCustomerId,
      address: '456 Updated Ave'
    };

    const result = await updateCustomer(updateInput);

    expect(result.address).toEqual('456 Updated Ave');
    expect(result.name).toEqual('Original Customer Name'); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    const updateInput: UpdateCustomerInput = {
      id: testCustomerId,
      name: 'Multi Updated Customer',
      email: 'multi@example.com',
      phone: '555-1111',
      address: '789 Multi St'
    };

    const result = await updateCustomer(updateInput);

    expect(result.name).toEqual('Multi Updated Customer');
    expect(result.email).toEqual('multi@example.com');
    expect(result.phone).toEqual('555-1111');
    expect(result.address).toEqual('789 Multi St');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set email to null', async () => {
    const updateInput: UpdateCustomerInput = {
      id: testCustomerId,
      email: null
    };

    const result = await updateCustomer(updateInput);

    expect(result.email).toBeNull();
    expect(result.name).toEqual('Original Customer Name'); // Should remain unchanged
  });

  it('should set phone to null', async () => {
    const updateInput: UpdateCustomerInput = {
      id: testCustomerId,
      phone: null
    };

    const result = await updateCustomer(updateInput);

    expect(result.phone).toBeNull();
    expect(result.name).toEqual('Original Customer Name'); // Should remain unchanged
  });

  it('should set address to null', async () => {
    const updateInput: UpdateCustomerInput = {
      id: testCustomerId,
      address: null
    };

    const result = await updateCustomer(updateInput);

    expect(result.address).toBeNull();
    expect(result.name).toEqual('Original Customer Name'); // Should remain unchanged
  });

  it('should update database record correctly', async () => {
    const updateInput: UpdateCustomerInput = {
      id: testCustomerId,
      name: 'Database Updated Name',
      email: 'db@example.com'
    };

    await updateCustomer(updateInput);

    // Verify the change persisted in database
    const customers = await db.select()
      .from(customersTable)
      .where(eq(customersTable.id, testCustomerId))
      .execute();

    expect(customers).toHaveLength(1);
    expect(customers[0].name).toEqual('Database Updated Name');
    expect(customers[0].email).toEqual('db@example.com');
    expect(customers[0].phone).toEqual('555-0123'); // Should remain unchanged
  });

  it('should update updated_at timestamp', async () => {
    const beforeUpdate = new Date();
    
    const updateInput: UpdateCustomerInput = {
      id: testCustomerId,
      name: 'Timestamp Test'
    };

    const result = await updateCustomer(updateInput);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
  });

  it('should throw error for non-existent customer', async () => {
    const updateInput: UpdateCustomerInput = {
      id: 'non-existent-id',
      name: 'Should Not Work'
    };

    await expect(updateCustomer(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle customer with null fields initially', async () => {
    // Create customer with null fields
    const customerWithNulls = await db.insert(customersTable)
      .values({
        id: 'test-customer-nulls',
        name: 'Null Fields Customer',
        email: null,
        phone: null,
        address: null,
        organization_id: testOrgId,
        created_by: testUserId
      })
      .returning()
      .execute();

    const updateInput: UpdateCustomerInput = {
      id: customerWithNulls[0].id,
      email: 'now-has-email@example.com',
      phone: '555-7777'
    };

    const result = await updateCustomer(updateInput);

    expect(result.name).toEqual('Null Fields Customer'); // Should remain unchanged
    expect(result.email).toEqual('now-has-email@example.com');
    expect(result.phone).toEqual('555-7777');
    expect(result.address).toBeNull(); // Should remain null
  });
});