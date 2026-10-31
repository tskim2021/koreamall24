import { Oaza } from "jp-zipcode-lookup";

export interface PostalCodeResult {
  prefecture: string;
  city: string;
  town: string;
}

/**
 * Looks up address by postal code
 * @param postalCode 7-digit postal code (without hyphen)
 * @returns address info or null
 */
export function lookupPostalCode(postalCode: string): PostalCodeResult | null {
  // Remove hyphens and extract digits only
  const cleanCode = postalCode.replace(/[^0-9]/g, "");
  
  // Return null if not 7 digits
  if (cleanCode.length !== 7) {
    return null;
  }

  try {
    const results = Oaza.byZipcode(cleanCode);
    
    if (results.length === 0) {
      return null;
    }

    // Use first result
    const oaza = results[0];
    
    return {
      prefecture: oaza.pref.name,
      city: oaza.city.name,
      town: oaza.name,
    };
  } catch (error) {
    console.error("Postal code lookup error:", error);
    return null;
  }
}
