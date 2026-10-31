import { describe, it, expect, beforeEach } from 'vitest';
import { addToCart, getCartItems, getDb } from './db';
import { cartItems } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Cart Separate Items Logic', () => {
  const testUserId = 999999;
  const testProductId = 360021;

  beforeEach(async () => {
    // Clean up test data
    const db = await getDb();
    if (db) {
      await db.delete(cartItems).where(eq(cartItems.userId, testUserId));
    }
  });

  it('should add same product with same priceTier as separate items', async () => {
    const priceTierId = 1;
    
    // Add first item
    const item1 = await addToCart(testUserId, testProductId, 2, priceTierId);
    expect(item1).toBeDefined();
    expect(item1?.quantity).toBe(2);
    
    // Add same product with same priceTier again
    const item2 = await addToCart(testUserId, testProductId, 3, priceTierId);
    expect(item2).toBeDefined();
    expect(item2?.quantity).toBe(3);
    expect(item2?.id).not.toBe(item1?.id); // Different cart item ID
    
    // Check cart has 2 separate items
    const cartItemsList = await getCartItems(testUserId);
    const sameProductItems = cartItemsList.filter(item => item.cartItem.productId === testProductId);
    expect(sameProductItems.length).toBe(2);
    expect(sameProductItems[0].cartItem.quantity).toBe(2);
    expect(sameProductItems[1].cartItem.quantity).toBe(3);
  });

  it('should add same product with different priceTiers as separate items', async () => {
    // Add with priceTier 1
    const item1 = await addToCart(testUserId, testProductId, 1, 1);
    expect(item1).toBeDefined();
    
    // Add with priceTier 2
    const item2 = await addToCart(testUserId, testProductId, 2, 2);
    expect(item2).toBeDefined();
    expect(item2?.id).not.toBe(item1?.id);
    
    // Check cart has 2 separate items with different priceTiers
    const cartItemsList = await getCartItems(testUserId);
    const sameProductItems = cartItemsList.filter(item => item.cartItem.productId === testProductId);
    expect(sameProductItems.length).toBe(2);
    expect(sameProductItems.find(i => i.cartItem.priceTierId === 1)).toBeDefined();
    expect(sameProductItems.find(i => i.cartItem.priceTierId === 2)).toBeDefined();
  });

  it('should add same product without priceTier as separate items', async () => {
    // Add first item without priceTier
    const item1 = await addToCart(testUserId, testProductId, 1);
    expect(item1).toBeDefined();
    
    // Add again without priceTier
    const item2 = await addToCart(testUserId, testProductId, 2);
    expect(item2).toBeDefined();
    expect(item2?.id).not.toBe(item1?.id);
    
    // Check cart has 2 separate items
    const cartItemsList = await getCartItems(testUserId);
    const sameProductItems = cartItemsList.filter(item => item.cartItem.productId === testProductId);
    expect(sameProductItems.length).toBe(2);
  });

  it('should allow multiple additions creating multiple cart items', async () => {
    // Add 5 times
    for (let i = 0; i < 5; i++) {
      const item = await addToCart(testUserId, testProductId, i + 1, 1);
      expect(item).toBeDefined();
    }
    
    // Check cart has 5 separate items
    const cartItemsList = await getCartItems(testUserId);
    const sameProductItems = cartItemsList.filter(item => item.cartItem.productId === testProductId);
    expect(sameProductItems.length).toBe(5);
    
    // Verify quantities
    const quantities = sameProductItems.map(item => item.cartItem.quantity).sort((a, b) => a - b);
    expect(quantities).toEqual([1, 2, 3, 4, 5]);
  });

  it('should maintain separate items even with mixed priceTiers', async () => {
    await addToCart(testUserId, testProductId, 1, 1);
    await addToCart(testUserId, testProductId, 2, 2);
    await addToCart(testUserId, testProductId, 3, 1); // Same priceTier as first
    await addToCart(testUserId, testProductId, 4); // No priceTier
    
    const cartItemsList = await getCartItems(testUserId);
    const sameProductItems = cartItemsList.filter(item => item.cartItem.productId === testProductId);
    expect(sameProductItems.length).toBe(4);
    
    // Verify each item is separate
    const ids = sameProductItems.map(item => item.cartItem.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(4); // All IDs are unique
  });
});
