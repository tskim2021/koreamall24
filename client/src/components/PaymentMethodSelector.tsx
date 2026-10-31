/**
 * PaymentMethodSelector
 * Reusable component that fetches active payment providers from the DB
 * and renders a selection UI for the checkout flow.
 * When bank_transfer is selected, shows account info with copy buttons on every field.
 */
import { trpc } from "@/lib/trpc";
import { CreditCard, Globe, Hash, DollarSign, Building2, CheckCircle2, RefreshCw, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export type PaymentProvider = "stripe" | "airwallex" | "2checkout" | "payoneer" | "bank_transfer" | "cookiepay" | "paypal";

interface Props {
  selected: PaymentProvider | null;
  onChange: (provider: PaymentProvider) => void;
  currency?: string;
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  stripe: <CreditCard className="w-5 h-5" />,
  airwallex: <Globe className="w-5 h-5" />,
  "2checkout": <Hash className="w-5 h-5" />,
  payoneer: <DollarSign className="w-5 h-5" />,
  bank_transfer: <Building2 className="w-5 h-5" />,
  cookiepay: <span className="text-base leading-none">🍪</span>,
  paypal: (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M19.554 7.345c.113-.73.113-1.37-.009-1.907C19.099 3.55 17.359 3 15.196 3H9.31a.974.974 0 0 0-.963.823L6.05 18.367a.583.583 0 0 0 .576.674h3.918l-.27 1.712a.51.51 0 0 0 .504.59h3.168c.423 0 .783-.308.849-.726l.035-.18.672-4.26.043-.235a.858.858 0 0 1 .848-.726h.535c3.461 0 6.168-1.406 6.959-5.474.33-1.698.16-3.116-.715-4.113a3.41 3.41 0 0 0-.668-.484z" fill="#009cde"/>
      <path d="M19.554 7.345a6.77 6.77 0 0 0-.437-.096 9.104 9.104 0 0 0-.492-.073c-.59-.083-1.235-.122-1.928-.122h-5.84a.858.858 0 0 0-.848.726l-1.241 7.874-.036.228a.974.974 0 0 1 .963-.823h2.006c3.939 0 7.021-1.6 7.924-6.228.027-.136.05-.269.07-.4a4.98 4.98 0 0 0-.141-.086z" fill="#012169"/>
      <path d="M10.009 7.78a.858.858 0 0 1 .848-.726h5.84c.693 0 1.338.04 1.928.122.17.024.334.052.492.073.158.022.3.05.437.096.07.023.14.046.207.07a4.98 4.98 0 0 1 .141.086c.33-2.104-.002-3.538-1.142-4.836C17.538 1.254 15.38.5 12.612.5H5.453a.974.974 0 0 0-.963.823L1.516 18.367a.583.583 0 0 0 .576.674h4.2l1.055-6.687 2.662-4.574z" fill="#003087"/>
    </svg>
  ),
};

const PROVIDER_COLORS: Record<string, string> = {
  stripe: "text-indigo-600",
  airwallex: "text-blue-600",
  "2checkout": "text-orange-600",
  payoneer: "text-red-600",
  bank_transfer: "text-green-600",
  cookiepay: "text-yellow-700",
  paypal: "text-blue-700",
};

/** Single copy-able row with animated feedback */
function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      toast.success(`${label}をコピーしました`);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-xs text-gray-500 w-20 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-800 flex-1 break-all">{value}</span>
      <button
        type="button"
        onClick={handleCopy}
        className={`flex-shrink-0 p-1 rounded transition-colors ${
          copied
            ? "text-green-600 bg-green-50"
            : "text-gray-400 hover:text-green-600 hover:bg-green-50"
        }`}
        title={`${label}をコピー`}
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function BankTransferInfo({ provider }: { provider: any }) {
  const hasInfo = provider.bankName || provider.accountNumber || provider.accountHolder;
  const deadlineDays = provider.paymentDeadlineDays || 7;

  if (!hasInfo) {
    return (
      <div className="mt-3 space-y-2">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          ※ 振込先口座情報は管理者にお問い合わせください。
        </div>
        <BankTransferNotice deadlineDays={deadlineDays} instructions={provider.instructions} />
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-xs font-semibold text-green-800 mb-2">振込先口座情報</p>
        <div className="divide-y divide-green-100">
          {provider.bankName && (
            <CopyRow label="銀行名" value={provider.bankName} />
          )}
          {provider.branchName && (
            <CopyRow label="支店名" value={provider.branchName} />
          )}
          {provider.accountNumber && (
            <CopyRow label="口座番号" value={provider.accountNumber} />
          )}
          {provider.accountHolder && (
            <CopyRow label="口座名義" value={provider.accountHolder} />
          )}
          {provider.swiftCode && (
            <CopyRow label="SWIFT" value={provider.swiftCode} />
          )}
        </div>
      </div>
      <BankTransferNotice deadlineDays={deadlineDays} instructions={provider.instructions} />
    </div>
  );
}

function BankTransferNotice({ deadlineDays, instructions }: { deadlineDays: number; instructions?: string | null }) {
  return (
    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg space-y-2">
      {/* 入金期限 */}
      <div className="flex items-start gap-2">
        <span className="text-orange-500 text-sm mt-0.5">⏰</span>
        <div>
          <p className="text-xs font-semibold text-orange-800">入金期限</p>
          <p className="text-xs text-orange-700">ご注文後 <span className="font-bold">{deadlineDays}日以内</span> にお振込みください。期限を過ぎた場合は自動キャンセルとなります。</p>
        </div>
      </div>
      {/* 注意事項 */}
      <div className="pt-2 border-t border-orange-200">
        <p className="text-xs font-semibold text-orange-800 mb-1">※ご注意事項</p>
        <ul className="text-xs text-orange-700 space-y-1 list-none">
          <li>・お振込手数料はお客様のご負担となります。</li>
          <li>・入金確認後、発送手続きを開始いたします（小孔を除く）。</li>
          <li>・入金者名義はご注文者名と一致するようにお願いします。</li>
          <li>・入金確認に数日かかる場合がございます。予めご了承ください。</li>
        </ul>
      </div>
      {instructions && (
        <div className="pt-2 border-t border-orange-200">
          <p className="text-xs text-orange-700 whitespace-pre-wrap">{instructions}</p>
        </div>
      )}
    </div>
  );
}

function PayoneerInfo({ provider }: { provider: any }) {
  if (!provider.payoneerEmail && !provider.instructions) return null;
  return (
    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-xs font-semibold text-red-800 mb-2">Payoneer 送金先</p>
      <div className="divide-y divide-red-100">
        {provider.payoneerEmail && (
          <CopyRow label="メール" value={provider.payoneerEmail} />
        )}
      </div>
      {provider.instructions && (
        <div className="mt-2 pt-2 border-t border-red-200">
          <p className="text-xs text-red-700 whitespace-pre-wrap">{provider.instructions}</p>
        </div>
      )}
    </div>
  );
}

export default function PaymentMethodSelector({ selected, onChange, currency }: Props) {
  const { data: providers, isLoading } = trpc.paymentSettings.providers.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-gray-400 text-sm">
        <RefreshCw className="w-4 h-4 animate-spin" />
        お支払い方法を読み込み中...
      </div>
    );
  }

  if (!providers || providers.length === 0) {
    return (
      <div className="py-4 text-sm text-gray-500 text-center">
        現在ご利用可能なお支払い方法がありません。管理者にお問い合わせください。
      </div>
    );
  }

  // Filter by currency if provided
  const filtered = currency
    ? providers.filter(
        (p) => !p.supportedCurrencies?.length || p.supportedCurrencies.includes(currency)
      )
    : providers;

  return (
    <div className="space-y-2">
      {filtered.map((provider) => {
        const isSelected = selected === provider.provider;
        const icon = PROVIDER_ICONS[provider.provider] || <CreditCard className="w-5 h-5" />;
        const colorClass = PROVIDER_COLORS[provider.provider] || "text-gray-600";

        return (
          <div key={provider.provider}>
            <label
              className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                isSelected
                  ? "border-pink-400 bg-pink-50 shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="paymentProvider"
                value={provider.provider}
                checked={isSelected}
                onChange={() => onChange(provider.provider as PaymentProvider)}
                className="sr-only"
              />
              <span className={`flex-shrink-0 ${colorClass}`}>{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{provider.displayName}</span>
                  {provider.isManual && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                      手動確認
                    </span>
                  )}
                </div>
              </div>
              {isSelected && (
                <CheckCircle2 className="w-5 h-5 text-pink-500 flex-shrink-0" />
              )}
            </label>

            {/* Bank Transfer: show account info with copy buttons when selected */}
            {isSelected && provider.provider === "bank_transfer" && (
              <BankTransferInfo provider={provider} />
            )}

            {/* Stripe: show card payment notice when selected */}
            {isSelected && provider.provider === "stripe" && (
              <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <p className="text-xs font-semibold text-indigo-800 mb-1">クレジットカード決済</p>
                <p className="text-xs text-indigo-700">「注文する」ボタンを押すと、Stripeの安全な決済ページに移動します。</p>
                <p className="text-xs text-indigo-600 mt-1">✔ Visa / Mastercard / JCB / アメリカンエキスプレス 対応</p>
                <div className="mt-2 pt-2 border-t border-indigo-200">
                  <p className="text-xs text-red-600">※お客様のカード情報を当店が確認・保管することは一切ございませんのでご安心ください。</p>
                </div>
              </div>
            )}

            {/* Payoneer: show payment instructions when selected */}
            {isSelected && provider.provider === "payoneer" && (
              <PayoneerInfo provider={provider} />
            )}

            {/* PayPal: show notice when selected */}
            {isSelected && provider.provider === "paypal" && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-800 mb-1">PayPal決済</p>
                <p className="text-xs text-blue-700">「注文する」ボタンを押すと、PayPalの安全な決済ページに移動します。</p>
                <p className="text-xs text-blue-600 mt-1">✔ PayPalアカウント / クレジットカード 対応</p>
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <p className="text-xs text-gray-500">※お客様のカード情報を当店が確認・保管することは一切ございませんのでご安心ください。</p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
