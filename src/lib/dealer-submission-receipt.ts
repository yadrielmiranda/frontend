import type { CompanyLocale } from "@/components/company/company-content";

export const dealerSubmittedPath = "/login/dealer-registration/submitted";
const receiptKey = "ae-dealer-submission-receipt";
const historyKey = "aeDealerSubmissionLocale";
const transferPrefix = "ae-dealer-submitted:";
const validForMs = 120_000;

type DealerReceipt = { locale: CompanyLocale };
type Transfer = DealerReceipt & { issuedAt: number; nonce: string };
let conversionPending = false;

// window.name ties the short-lived receipt to this navigation. A copied URL or
// a new tab with a cloned sessionStorage must not inherit the conversion.
export function transferDealerReceipt(receipt: DealerReceipt) {
  const originalName = window.name;
  try {
    const nonce = window.crypto.randomUUID();
    window.sessionStorage.setItem(receiptKey, JSON.stringify({ ...receipt, nonce, issuedAt: Date.now() }));
    window.name = transferPrefix + nonce;
    // The invitation document declares no-referrer. A hard replacement prevents
    // its token, form fields and React state from accompanying the SDK.
    window.location.replace(dealerSubmittedPath);
    return true;
  } catch {
    try {
      window.sessionStorage.removeItem(receiptKey);
      window.name = originalName;
    } catch { /* The form can still show its regular submission confirmation. */ }
    return false;
  }
}

export function takeDealerSubmissionReceipt(): (DealerReceipt & { fresh: boolean }) | null {
  try {
    if (window.location.pathname !== dealerSubmittedPath || window.location.search || window.location.hash) return null;
    const raw = window.sessionStorage.getItem(receiptKey);
    window.sessionStorage.removeItem(receiptKey);
    const tabName = window.name;
    if (tabName.startsWith(transferPrefix)) window.name = "";
    if (!raw || !tabName.startsWith(transferPrefix)) {
      const locale = window.history.state?.[historyKey];
      return locale === "en" || locale === "es" ? { locale, fresh: false } : null;
    }
    const receipt: Transfer = JSON.parse(raw);
    const age = Date.now() - receipt.issuedAt;
    if (typeof receipt.nonce !== "string" || tabName !== transferPrefix + receipt.nonce ||
        !Number.isFinite(age) || age < 0 || age > validForMs ||
        (receipt.locale !== "en" && receipt.locale !== "es")) return null;
    const navigation = window.performance?.getEntriesByType?.("navigation")[0] as PerformanceNavigationTiming | undefined;
    conversionPending = navigation?.type === "navigate";
    // Preserve only the generic confirmation on reload. History never grants
    // permission to report an event and contains no applicant information.
    try { window.history.replaceState({ ...window.history.state, [historyKey]: receipt.locale }, ""); } catch { /* Optional. */ }
    return { locale: receipt.locale, fresh: conversionPending };
  } catch { return null; }
}

export function consumeDealerConversionHandoff() {
  const pending = conversionPending;
  conversionPending = false;
  return pending;
}
