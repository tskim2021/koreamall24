/**
 * Tests for japanPost.syncShipment tRPC procedure
 * 
 * Validates manual shipment synchronization functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from './routers';
import { getDb } from './db';
import type { Context } from './_core/context';

describe('japanPost.syncShipment', () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testOrderId: number;
  let testShipmentId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error('Database connection failed');

    // Create test order with shipment
    const { orders, shipments } = await import('../drizzle/schema');
    
    const [order] = await db.insert(orders).values({
      userId: 1,
      orderNumber: `TS${Date.now()}`,
      status: 'shipped',
      totalAmount: '10000',
      shippingFee: '0',
      pointsUsed: 0,
      pointsEarned: 100,
      shippingName: 'Test User',
      shippingPostalCode: '100-0001',
      shippingAddress: 'Tokyo Test Address',
      shippingPhone: '090-1234-5678',
      paymentMethod: 'stripe',
      paymentStatus: 'paid',
    }).$returningId();

    testOrderId = order.id;

    const [shipment] = await db.insert(shipments).values({
      orderId: testOrderId,
      trackingNumber: `TEST${Date.now()}`, // Unique test tracking number
      carrier: 'Japan Post',
      status: 'pending',
    }).$returningId();

    testShipmentId = shipment.id;
  });

  afterAll(async () => {
    if (!db) return;

    // Cleanup test data
    const { orders, shipments, shipmentEvents } = await import('../drizzle/schema');
    const { eq } = await import('drizzle-orm');

    await db.delete(shipmentEvents).where(eq(shipmentEvents.shipmentId, testShipmentId));
    await db.delete(shipments).where(eq(shipments.id, testShipmentId));
    await db.delete(orders).where(eq(orders.id, testOrderId));
  });

  it('should accept orderId parameter', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: 'test-admin', name: 'Test Admin', role: 'admin' },
    } as Context);

    // Test with non-existent tracking number (won't call real API)
    const result = await caller.japanPost.syncShipment({ orderId: testOrderId });

    expect(result).toBeDefined();
    expect(result.orderId).toBe(testOrderId);
    expect(result.updated).toBe(false); // No real tracking data
  });

  it('should handle non-existent order gracefully', async () => {
    const caller = appRouter.createCaller({
      user: { id: 1, openId: 'test-admin', name: 'Test Admin', role: 'admin' },
    } as Context);

    const result = await caller.japanPost.syncShipment({ orderId: 999999 });

    expect(result.updated).toBe(false);
    expect(result.message).toContain('No shipment information found');
  });
});
