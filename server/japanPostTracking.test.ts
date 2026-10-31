import { describe, it, expect } from 'vitest';
import { isValidJapanPostTrackingNumber } from '../server/_core/japanPostTracking';

describe('Japan Post Tracking', () => {
  describe('isValidJapanPostTrackingNumber', () => {
    it('should accept valid 11-digit tracking numbers', () => {
      expect(isValidJapanPostTrackingNumber('12345678901')).toBe(true);
    });

    it('should accept valid 13-digit tracking numbers', () => {
      expect(isValidJapanPostTrackingNumber('1234567890123')).toBe(true);
    });

    it('should accept formatted tracking numbers with hyphens', () => {
      expect(isValidJapanPostTrackingNumber('1234567890-12')).toBe(true);
    });

    it('should reject invalid tracking numbers', () => {
      expect(isValidJapanPostTrackingNumber('123')).toBe(false);
      expect(isValidJapanPostTrackingNumber('12345678901234')).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(isValidJapanPostTrackingNumber('')).toBe(false);
    });

    it('should accept international format RM767809377IN', () => {
      expect(isValidJapanPostTrackingNumber('RM767809377IN')).toBe(true);
    });

    it('should accept international format with spaces', () => {
      expect(isValidJapanPostTrackingNumber('RM 7678 0937 7IN')).toBe(true);
    });

    it('should accept international format with hyphens', () => {
      expect(isValidJapanPostTrackingNumber('RM-7678-0937-7IN')).toBe(true);
    });

    it('should accept international format with 1 letter', () => {
      expect(isValidJapanPostTrackingNumber('1234567890123A')).toBe(true);
    });

    it('should reject international format with less than 13 characters', () => {
      expect(isValidJapanPostTrackingNumber('123456789IN')).toBe(false);
    });
  });
});
