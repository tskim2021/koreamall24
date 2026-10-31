import { describe, it, expect } from "vitest";
import {
  validatePostalCode,
  validatePhoneNumber,
  validatePrefecture,
  validateCity,
  validateAddress1,
  validateNameKanji,
  validateNameHiragana,
  validateCompleteAddress,
} from "../client/src/lib/addressValidation";

describe("Address Validation", () => {
  describe("validatePostalCode", () => {
    it("should accept valid 7-digit postal code", () => {
      const result = validatePostalCode("1234567");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject empty postal code", () => {
      const result = validatePostalCode("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("郵便番号を入力してください");
    });

    it("should reject postal code with less than 7 digits", () => {
      const result = validatePostalCode("123456");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("郵便番号は7桁の数字で入力してください");
    });

    it("should reject postal code with more than 7 digits", () => {
      const result = validatePostalCode("12345678");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("郵便番号は7桁の数字で入力してください");
    });

    it("should accept postal code with hyphen and convert to 7 digits", () => {
      const result = validatePostalCode("123-4567");
      expect(result.isValid).toBe(true);
    });
  });

  describe("validatePhoneNumber", () => {
    it("should accept valid 11-digit mobile number", () => {
      const result = validatePhoneNumber("09012345678");
      expect(result.isValid).toBe(true);
    });

    it("should accept valid 10-digit landline number", () => {
      const result = validatePhoneNumber("0312345678");
      expect(result.isValid).toBe(true);
    });

    it("should accept phone number with hyphens", () => {
      const result = validatePhoneNumber("090-1234-5678");
      expect(result.isValid).toBe(true);
    });

    it("should reject empty phone number", () => {
      const result = validatePhoneNumber("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("電話番号を入力してください");
    });

    it("should reject phone number with less than 10 digits", () => {
      const result = validatePhoneNumber("090123456");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("電話番号は10〜11桁の数字で入力してください");
    });

    it("should reject phone number not starting with 0", () => {
      const result = validatePhoneNumber("19012345678");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("電話番号は0から始まる必要があります");
    });
  });

  describe("validatePrefecture", () => {
    it("should accept valid prefecture", () => {
      const result = validatePrefecture("東京都");
      expect(result.isValid).toBe(true);
    });

    it("should reject empty prefecture", () => {
      const result = validatePrefecture("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("都道府県を入力してください");
    });

    it("should reject too short prefecture", () => {
      const result = validatePrefecture("東");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("都道府県名が正しくありません");
    });
  });

  describe("validateCity", () => {
    it("should accept valid city", () => {
      const result = validateCity("渋谷区");
      expect(result.isValid).toBe(true);
    });

    it("should reject empty city", () => {
      const result = validateCity("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("市区町村を入力してください");
    });

    it("should reject too short city", () => {
      const result = validateCity("渋");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("市区町村名が短すぎます");
    });
  });

  describe("validateAddress1", () => {
    it("should accept valid address", () => {
      const result = validateAddress1("道玄坂1-2-3");
      expect(result.isValid).toBe(true);
    });

    it("should reject empty address", () => {
      const result = validateAddress1("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("番地を入力してください");
    });

    it("should reject too short address", () => {
      const result = validateAddress1("1-");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("番地が短すぎます");
    });
  });

  describe("validateNameKanji", () => {
    it("should accept valid kanji name", () => {
      const result = validateNameKanji("山田太郎");
      expect(result.isValid).toBe(true);
    });

    it("should reject empty name", () => {
      const result = validateNameKanji("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("お名前（漢字）を入力してください");
    });

    it("should reject too short name", () => {
      const result = validateNameKanji("山");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("お名前が短すぎます");
    });
  });

  describe("validateNameHiragana", () => {
    it("should accept valid hiragana name", () => {
      const result = validateNameHiragana("やまだたろう");
      expect(result.isValid).toBe(true);
    });

    it("should reject empty name", () => {
      const result = validateNameHiragana("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("お名前（ひらがな）を入力してください");
    });

    it("should reject name with non-hiragana characters", () => {
      const result = validateNameHiragana("山田太郎");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("ひらがなで入力してください");
    });

    it("should reject name with katakana", () => {
      const result = validateNameHiragana("ヤマダタロウ");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("ひらがなで入力してください");
    });

    it("should accept hiragana name with spaces", () => {
      const result = validateNameHiragana("やまだ たろう");
      expect(result.isValid).toBe(true);
    });
  });

  describe("validateCompleteAddress", () => {
    it("should accept valid complete address", () => {
      const result = validateCompleteAddress({
        recipientNameKanji: "山田太郎",
        recipientNameHiragana: "やまだたろう",
        postalCode: "1234567",
        prefecture: "東京都",
        city: "渋谷区",
        address1: "道玄坂1-2-3",
        phone: "09012345678",
      });
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });

    it("should return all errors for invalid address", () => {
      const result = validateCompleteAddress({
        recipientNameKanji: "",
        recipientNameHiragana: "山田",
        postalCode: "123",
        prefecture: "",
        city: "渋",
        address1: "1",
        phone: "123",
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.recipientNameKanji).toBeDefined();
      expect(result.errors.recipientNameHiragana).toBeDefined();
      expect(result.errors.postalCode).toBeDefined();
      expect(result.errors.prefecture).toBeDefined();
      expect(result.errors.city).toBeDefined();
      expect(result.errors.address1).toBeDefined();
      expect(result.errors.phone).toBeDefined();
    });

    it("should return specific error messages", () => {
      const result = validateCompleteAddress({
        recipientNameKanji: "",
        recipientNameHiragana: "やまだたろう",
        postalCode: "1234567",
        prefecture: "東京都",
        city: "渋谷区",
        address1: "道玄坂1-2-3",
        phone: "09012345678",
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.recipientNameKanji).toBe("お名前（漢字）を入力してください");
    });
  });
});
