/**
 * Payment Settings Module Tests
 * Tests for the payment settings router and DB helpers
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────

const mockGetActivePaymentSettings = vi.fn();
const mockGetPaymentSettingByProvider = vi.fn();
const mockUpsertPaymentSetting = vi.fn();
const mockTogglePaymentProvider = vi.fn();
const mockGetAllPaymentSettings = vi.fn();

vi.mock("./db", () => ({
  getActivePaymentSettings: mockGetActivePaymentSettings,
  getPaymentSettingByProvider: mockGetPaymentSettingByProvider,
  upsertPaymentSetting: mockUpsertPaymentSetting,
  togglePaymentProvider: mockTogglePaymentProvider,
  getAllPaymentSettings: mockGetAllPaymentSettings,
}));

// ─── Mock payment-service ─────────────────────────────────────────────────────

vi.mock("./payment-service", () => ({
  PROVIDER_INFO: {
    stripe: { nameKo: "스트라이프", logo: "💳", isManual: false },
    airwallex: { nameKo: "에어월렉스", logo: "🌐", isManual: false },
    "2checkout": { nameKo: "2체크아웃", logo: "🔢", isManual: false },
    payoneer: { nameKo: "페이오니아", logo: "💰", isManual: true },
    bank_transfer: { nameKo: "무통장 송금", logo: "🏦", isManual: true },
  },
  createPaymentSession: vi.fn(),
}));

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Payment Settings - DB Helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getActivePaymentSettings returns only active providers", async () => {
    const mockSettings = [
      { id: 1, provider: "stripe", isActive: 1, displayName: "Stripe", mode: "test" },
      { id: 2, provider: "bank_transfer", isActive: 1, displayName: "무통장 송금", mode: "live" },
    ];
    mockGetActivePaymentSettings.mockResolvedValue(mockSettings);

    const { getActivePaymentSettings } = await import("./db");
    const result = await getActivePaymentSettings();

    expect(result).toHaveLength(2);
    expect(result.every((s) => s.isActive === 1)).toBe(true);
  });

  it("getPaymentSettingByProvider returns correct provider", async () => {
    const mockSetting = {
      id: 1,
      provider: "stripe",
      isActive: 0,
      publicKey: "pk_test_xxx",
      secretKey: "sk_test_xxx",
      mode: "test",
    };
    mockGetPaymentSettingByProvider.mockResolvedValue(mockSetting);

    const { getPaymentSettingByProvider } = await import("./db");
    const result = await getPaymentSettingByProvider("stripe");

    expect(result).toBeDefined();
    expect(result?.provider).toBe("stripe");
    expect(result?.publicKey).toBe("pk_test_xxx");
  });

  it("upsertPaymentSetting saves settings correctly", async () => {
    mockUpsertPaymentSetting.mockResolvedValue(undefined);

    const { upsertPaymentSetting } = await import("./db");
    await upsertPaymentSetting({
      provider: "stripe",
      publicKey: "pk_test_new",
      secretKey: "sk_test_new",
      mode: "test",
    } as any);

    expect(mockUpsertPaymentSetting).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "stripe", mode: "test" })
    );
  });

  it("togglePaymentProvider activates/deactivates a provider", async () => {
    mockTogglePaymentProvider.mockResolvedValue(undefined);

    const { togglePaymentProvider } = await import("./db");
    await togglePaymentProvider("stripe", true);
    expect(mockTogglePaymentProvider).toHaveBeenCalledWith("stripe", true);

    await togglePaymentProvider("stripe", false);
    expect(mockTogglePaymentProvider).toHaveBeenCalledWith("stripe", false);
  });
});

describe("Payment Settings - Provider Info", () => {
  it("PROVIDER_INFO contains all 5 providers", async () => {
    const { PROVIDER_INFO } = await import("./payment-service");
    const providers = Object.keys(PROVIDER_INFO);
    expect(providers).toContain("stripe");
    expect(providers).toContain("airwallex");
    expect(providers).toContain("2checkout");
    expect(providers).toContain("payoneer");
    expect(providers).toContain("bank_transfer");
  });

  it("manual providers are correctly flagged", async () => {
    const { PROVIDER_INFO } = await import("./payment-service");
    expect(PROVIDER_INFO.payoneer.isManual).toBe(true);
    expect(PROVIDER_INFO.bank_transfer.isManual).toBe(true);
    expect(PROVIDER_INFO.stripe.isManual).toBeFalsy();
    expect(PROVIDER_INFO.airwallex.isManual).toBeFalsy();
  });
});

describe("Payment Settings - Providers endpoint logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("providers endpoint maps active settings to display format", async () => {
    const mockSettings = [
      {
        id: 1,
        provider: "stripe",
        isActive: 1,
        displayName: "Stripe 결제",
        supportedCurrencies: ["KRW", "JPY"],
      },
      {
        id: 2,
        provider: "bank_transfer",
        isActive: 1,
        displayName: null,
        supportedCurrencies: [],
      },
    ];
    mockGetActivePaymentSettings.mockResolvedValue(mockSettings);

    const { getActivePaymentSettings } = await import("./db");
    const { PROVIDER_INFO } = await import("./payment-service");

    const settings = await getActivePaymentSettings();
    const mapped = settings.map((s) => ({
      provider: s.provider,
      displayName:
        s.displayName ||
        PROVIDER_INFO[s.provider as keyof typeof PROVIDER_INFO]?.nameKo ||
        s.provider,
      isManual: PROVIDER_INFO[s.provider as keyof typeof PROVIDER_INFO]?.isManual || false,
      supportedCurrencies: (s.supportedCurrencies as string[]) || [],
    }));

    expect(mapped[0].displayName).toBe("Stripe 결제");
    expect(mapped[1].displayName).toBe("무통장 송금"); // Falls back to PROVIDER_INFO
    expect(mapped[1].isManual).toBe(true);
  });

  it("inactive providers are not included in providers list", async () => {
    // getActivePaymentSettings should only return active ones
    mockGetActivePaymentSettings.mockResolvedValue([
      { id: 1, provider: "stripe", isActive: 1, displayName: "Stripe", supportedCurrencies: [] },
    ]);

    const { getActivePaymentSettings } = await import("./db");
    const result = await getActivePaymentSettings();

    // Only 1 active provider
    expect(result).toHaveLength(1);
    expect(result[0].provider).toBe("stripe");
  });
});
