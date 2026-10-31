import { describe, it, expect } from "vitest";
import {
  trackRecommendationEvent,
  getRecommendationStats,
  getTopRecommendedProducts,
} from "./db";

describe("Recommendation Tracking and Stats", () => {
  it("should track recommendation impression event", async () => {
    // Track an impression event
    await trackRecommendationEvent(1, 2, 'tag_based', 'impression', 1);
    
    // No error should be thrown
    expect(true).toBe(true);
  });

  it("should track recommendation click event", async () => {
    // Track a click event
    await trackRecommendationEvent(1, 2, 'tag_based', 'click', 1);
    
    // No error should be thrown
    expect(true).toBe(true);
  });

  it("should get recommendation stats", async () => {
    const stats = await getRecommendationStats();
    
    // Stats should be an array
    expect(Array.isArray(stats)).toBe(true);
    
    // Each stat should have required fields
    if (stats.length > 0) {
      const stat = stats[0];
      expect(stat).toHaveProperty('recommendationType');
      expect(stat).toHaveProperty('impressions');
      expect(stat).toHaveProperty('clicks');
      expect(stat).toHaveProperty('ctr');
      
      // CTR should be a number
      expect(typeof stat.ctr).toBe('number');
    }
  });

  it("should get top recommended products by type", async () => {
    const products = await getTopRecommendedProducts('tag_based', 5);
    
    // Products should be an array
    expect(Array.isArray(products)).toBe(true);
    
    // Each product should have required fields
    if (products.length > 0) {
      const item = products[0];
      expect(item).toHaveProperty('product');
      expect(item).toHaveProperty('impressions');
      expect(item).toHaveProperty('clicks');
      expect(item).toHaveProperty('ctr');
      
      // Product should have id and name
      expect(item.product).toHaveProperty('id');
      expect(item.product).toHaveProperty('nameJa');
    }
  });

  it("should calculate CTR correctly", async () => {
    // Track multiple impressions and clicks
    await trackRecommendationEvent(10, 20, 'collaborative', 'impression');
    await trackRecommendationEvent(10, 20, 'collaborative', 'impression');
    await trackRecommendationEvent(10, 20, 'collaborative', 'impression');
    await trackRecommendationEvent(10, 20, 'collaborative', 'click');
    
    const stats = await getRecommendationStats();
    
    // Find collaborative stats
    const collaborativeStat = stats.find(s => s.recommendationType === 'collaborative');
    
    if (collaborativeStat) {
      // CTR should be calculated correctly (clicks / impressions * 100)
      const expectedCTR = (collaborativeStat.clicks / collaborativeStat.impressions) * 100;
      expect(collaborativeStat.ctr).toBeCloseTo(expectedCTR, 2);
    }
  });
});
