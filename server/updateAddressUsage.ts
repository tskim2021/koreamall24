import { getDb } from "./db";
import { addresses } from "../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Update the lastUsedAt timestamp for an address
 * @param addressId The ID of the address to update
 * @param userId The user ID (for security check)
 */
export async function updateAddressLastUsed(addressId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update address usage: database not available");
    return false;
  }

  try {
    await db
      .update(addresses)
      .set({ lastUsedAt: new Date() })
      .where(eq(addresses.id, addressId));
    
    return true;
  } catch (error) {
    console.error("[Database] Failed to update address usage:", error);
    return false;
  }
}

/**
 * Update the lastUsedAt timestamp based on shipping address details
 * Finds the matching address by comparing address fields
 */
export async function updateAddressLastUsedByDetails(
  userId: number,
  shippingAddress: {
    postalCode: string;
    prefecture: string;
    city: string;
    address1: string;
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update address usage: database not available");
    return false;
  }

  try {
    // Find matching address
    const matchingAddresses = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, userId));
    
    const matchedAddress = matchingAddresses.find(addr => 
      addr.postalCode === shippingAddress.postalCode &&
      addr.prefecture === shippingAddress.prefecture &&
      addr.city === shippingAddress.city &&
      addr.address1 === shippingAddress.address1
    );

    if (matchedAddress) {
      await db
        .update(addresses)
        .set({ lastUsedAt: new Date() })
        .where(eq(addresses.id, matchedAddress.id));
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("[Database] Failed to update address usage by details:", error);
    return false;
  }
}
