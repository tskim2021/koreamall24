/**
 * Address validation utilities for Japanese addresses
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate Japanese postal code (7 digits)
 */
export function validatePostalCode(postalCode: string): ValidationResult {
  if (!postalCode) {
    return { isValid: false, error: "郵便番号を入力してください" };
  }

  const cleaned = postalCode.replace(/[^0-9]/g, "");
  
  if (cleaned.length !== 7) {
    return { isValid: false, error: "郵便番号は7桁の数字で入力してください" };
  }

  return { isValid: true };
}

/**
 * Validate Japanese phone number
 * Accepts formats: 090-1234-5678, 09012345678, 03-1234-5678, 0312345678
 */
export function validatePhoneNumber(phone: string): ValidationResult {
  if (!phone) {
    return { isValid: false, error: "電話番号を入力してください" };
  }

  const cleaned = phone.replace(/[^0-9]/g, "");
  
  // Japanese phone numbers are typically 10-11 digits
  if (cleaned.length < 10 || cleaned.length > 11) {
    return { isValid: false, error: "電話番号は10〜11桁の数字で入力してください" };
  }

  // Must start with 0
  if (!cleaned.startsWith("0")) {
    return { isValid: false, error: "電話番号は0から始まる必要があります" };
  }

  return { isValid: true };
}

/**
 * Validate prefecture name
 */
export function validatePrefecture(prefecture: string): ValidationResult {
  if (!prefecture) {
    return { isValid: false, error: "都道府県を入力してください" };
  }

  if (prefecture.length < 2 || prefecture.length > 10) {
    return { isValid: false, error: "都道府県名が正しくありません" };
  }

  return { isValid: true };
}

/**
 * Validate city name
 */
export function validateCity(city: string): ValidationResult {
  if (!city) {
    return { isValid: false, error: "市区町村を入力してください" };
  }

  if (city.length < 2) {
    return { isValid: false, error: "市区町村名が短すぎます" };
  }

  return { isValid: true };
}

/**
 * Validate address line 1 (street address)
 */
export function validateAddress1(address1: string): ValidationResult {
  if (!address1) {
    return { isValid: false, error: "番地を入力してください" };
  }

  if (address1.length < 3) {
    return { isValid: false, error: "番地が短すぎます" };
  }

  return { isValid: true };
}

/**
 * Validate recipient name (Kanji)
 */
export function validateNameKanji(name: string): ValidationResult {
  if (!name) {
    return { isValid: false, error: "お名前（漢字）を入力してください" };
  }

  if (name.length < 2) {
    return { isValid: false, error: "お名前が短すぎます" };
  }

  return { isValid: true };
}

/**
 * Validate recipient name (Hiragana)
 */
export function validateNameHiragana(name: string): ValidationResult {
  if (!name) {
    return { isValid: false, error: "お名前（ひらがな）を入力してください" };
  }

  if (name.length < 2) {
    return { isValid: false, error: "お名前が短すぎます" };
  }

  // Check if contains only hiragana characters
  const hiraganaRegex = /^[\u3040-\u309F\s]+$/;
  if (!hiraganaRegex.test(name)) {
    return { isValid: false, error: "ひらがなで入力してください" };
  }

  return { isValid: true };
}

/**
 * Validate recipient name (Katakana - フリガナ)
 */
export function validateNameKatakana(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: "フリガナ（カタカナ）を入力してください" };
  }

  // Strip full-width spaces used as separator between sei and mei
  const stripped = name.replace(/[\s\u3000]/g, "");

  if (stripped.length < 2) {
    return { isValid: false, error: "お名前が短すぎます" };
  }

  // Allow katakana, full-width spaces, and half-width spaces
  const katakanaRegex = /^[\u30A0-\u30FF\uFF65-\uFF9F\s\u3000]+$/;
  if (!katakanaRegex.test(name)) {
    return { isValid: false, error: "カタカナで入力してください" };
  }

  return { isValid: true };
}

/**
 * Validate complete address
 */
export function validateCompleteAddress(address: {
  recipientNameKanji: string;
  recipientNameHiragana: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  phone: string;
}): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  const nameKanjiResult = validateNameKanji(address.recipientNameKanji);
  if (!nameKanjiResult.isValid) {
    errors.recipientNameKanji = nameKanjiResult.error!;
  }

  const nameHiraganaResult = validateNameHiragana(address.recipientNameHiragana);
  if (!nameHiraganaResult.isValid) {
    errors.recipientNameHiragana = nameHiraganaResult.error!;
  }

  const postalCodeResult = validatePostalCode(address.postalCode);
  if (!postalCodeResult.isValid) {
    errors.postalCode = postalCodeResult.error!;
  }

  const prefectureResult = validatePrefecture(address.prefecture);
  if (!prefectureResult.isValid) {
    errors.prefecture = prefectureResult.error!;
  }

  const cityResult = validateCity(address.city);
  if (!cityResult.isValid) {
    errors.city = cityResult.error!;
  }

  const address1Result = validateAddress1(address.address1);
  if (!address1Result.isValid) {
    errors.address1 = address1Result.error!;
  }

  const phoneResult = validatePhoneNumber(address.phone);
  if (!phoneResult.isValid) {
    errors.phone = phoneResult.error!;
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
