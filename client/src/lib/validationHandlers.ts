import {
  validatePostalCode,
  validatePhoneNumber,
  validatePrefecture,
  validateCity,
  validateAddress1,
  validateNameKanji,
  validateNameHiragana,
  validateNameKatakana,
} from "./addressValidation";

/**
 * Create validation handlers for real-time form validation
 */
export function createValidationHandlers(
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>
) {
  const clearError = (field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const setError = (field: string, message: string) => {
    setErrors((prev) => ({
      ...prev,
      [field]: message,
    }));
  };

  return {
    validatePostalCodeField: (value: string) => {
      const result = validatePostalCode(value);
      if (!result.isValid && value.length > 0) {
        setError("postalCode", result.error!);
      } else {
        clearError("postalCode");
      }
      return result.isValid;
    },

    validatePhoneField: (value: string) => {
      const result = validatePhoneNumber(value);
      if (!result.isValid && value.length > 0) {
        setError("phone", result.error!);
      } else {
        clearError("phone");
      }
      return result.isValid;
    },

    validatePrefectureField: (value: string) => {
      const result = validatePrefecture(value);
      if (!result.isValid && value.length > 0) {
        setError("prefecture", result.error!);
      } else {
        clearError("prefecture");
      }
      return result.isValid;
    },

    validateCityField: (value: string) => {
      const result = validateCity(value);
      if (!result.isValid && value.length > 0) {
        setError("city", result.error!);
      } else {
        clearError("city");
      }
      return result.isValid;
    },

    validateAddress1Field: (value: string) => {
      const result = validateAddress1(value);
      if (!result.isValid && value.length > 0) {
        setError("address1", result.error!);
      } else {
        clearError("address1");
      }
      return result.isValid;
    },

    validateNameKanjiField: (value: string) => {
      const result = validateNameKanji(value);
      if (!result.isValid && value.length > 0) {
        setError("recipientNameKanji", result.error!);
      } else {
        clearError("recipientNameKanji");
      }
      return result.isValid;
    },

    validateNameHiraganaField: (value: string) => {
      // フリガナ field uses katakana validation
      const result = validateNameKatakana(value);
      if (!result.isValid && value.trim().length > 0) {
        setError("recipientNameHiragana", result.error!);
      } else {
        clearError("recipientNameHiragana");
      }
      return result.isValid;
    },
  };
}
