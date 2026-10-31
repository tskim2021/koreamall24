/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// Product type from drizzle schema
import { products } from "../drizzle/schema";
export type Product = typeof products.$inferSelect;
