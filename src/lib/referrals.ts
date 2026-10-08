export type ReferralMoney = string | number;
export type ReferralMode = "EXTERNAL_MARGIN" | "CUSTOM_PERCENT" | "DEALER_PLAN";
export type ReferralRole = "CLIENT" | "DISTRIBUTOR" | "SUBDEALER_INTERNAL" | "SUBDEALER_EXTERNAL" | "DEALER_EXTERNAL" | "DEALER_INTERNAL";
export type PayoutStatus = "REQUESTED" | "PROCESSING" | "PAID" | "CANCELED" | "REJECTED" | "FAILED";
export interface ReferralProfile {
  enabled: boolean;
  code: string | null;
  linkCreatedAt?: string | null;
}
export interface ReferralAdminProfile extends ReferralProfile {
  mode: ReferralMode | null;
  percent: ReferralMoney | null;
}
export interface ReferralRoleDefault {
  role: ReferralRole;
  mode: ReferralMode;
  percent: ReferralMoney | null;
  revision: number;
  allowedModes: ReferralMode[];
}
export type ReferralProfileInput = { useRoleDefaults: true } | { useRoleDefaults: false; enabled: boolean; mode: ReferralMode; percent?: string };
export interface ReferralBankSummary {
  holderName: string;
  holderType: "PERSONAL" | "BUSINESS";
  bankName: string;
  accountType: "CHECKING" | "SAVINGS";
  accountLast4: string;
  routingLast4: string;
  updatedAt?: string;
}
export interface ReferralBankInput {
  holderName: string;
  holderType: "PERSONAL" | "BUSINESS";
  bankName: string;
  accountType: "CHECKING" | "SAVINGS";
  routingNumber: string;
  accountNumber: string;
  confirmAccountNumber: string;
  authorized: boolean;
}
export interface ReferralPayout {
  processingById?: number | null;
  id: number;
  amount: ReferralMoney;
  status: PayoutStatus;
  requestedAt: string;
  paidAt?: string | null;
  reference?: string | null;
  note?: string | null;
  bankName: string;
  accountLast4: string;
  userId?: number;
  userName?: string;
  bankFee?: ReferralMoney | null;
  proofReference?: string | null;
}
export interface ReferralDashboard {
  referralsPage?: number;
  rewardsPage?: number;
  payoutsPage?: number;
  referralPages?: number;
  rewardPages?: number;
  payoutPages?: number;
  referralCount?: number;
  rewardCount?: number;
  payoutCount?: number;
  profile: ReferralProfile | null;
  balances: { pending: ReferralMoney; available: ReferralMoney; reserved: ReferralMoney; paid: ReferralMoney; adjustmentDebt?: ReferralMoney };
  minimumWithdrawal: ReferralMoney;
  bank: ReferralBankSummary | null;
  referrals: { id: number; firstName: string; joinedAt: string; rewardTotal: ReferralMoney }[];
  rewards: { id: number; firstName: string; createdAt: string; amount: ReferralMoney; status: string; reason?: string | null }[];
  payouts: ReferralPayout[];
}
export interface ReferralAdminUser {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  role: string;
  dealerMode?: "INTERNAL" | "EXTERNAL" | null;
  parentDealerId?: number | null;
  referralRole: ReferralRole;
  useRoleDefaults: boolean;
  configurationIssue?: "MISSING_DEALER_PLAN" | null;
  allowedModes: ReferralMode[];
  profile: ReferralAdminProfile | null;
}
export interface ReferralAdminDashboard {
  summary?: { earned: ReferralMoney; available: ReferralMoney; reserved: ReferralMoney; paid: ReferralMoney; bankFees: ReferralMoney; rewardsAreCached: boolean; rewardsLastEvaluatedAt: string | null };
  payoutsPage?: number;
  payoutPages?: number;
  payoutCount?: number;
  payoutStatus?: string;
  settings: { minimumWithdrawal: ReferralMoney };
  payouts: ReferralPayout[];
}
export interface ReferralAdminRoleDefaults {
  roleDefaults: ReferralRoleDefault[];
}
export interface ReferralAdminUsers extends ReferralAdminRoleDefaults {
  users: ReferralAdminUser[];
  userCount: number;
  page: number;
  pages: number;
  limit: number;
}
export interface ReferralPayoutTransition {
  status: "PROCESSING" | "PAID" | "REJECTED" | "FAILED";
  reference?: string;
  paidAt?: string;
  bankFee?: string;
  proofReference?: string;
  note?: string;
  confirmedNotSent?: boolean;
}
export interface ReferralPayoutRecovery {
  status: "PAID" | "FAILED";
  expectedProcessingById: number;
  bankOutcomeConfirmed: true;
  note: string;
  reference?: string;
  paidAt?: string;
  bankFee?: string;
  proofReference?: string;
  confirmedNotSent?: boolean;
}
export const referralMoney = (value: ReferralMoney) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
export const referralDate = (value?: string | null) => value ? new Date(value).toLocaleDateString("en-US") : "—";
export const referralStatus = (value: string) => ({
  REQUESTED: "Requested", PROCESSING: "Processing", PAID: "Paid", CANCELED: "Canceled", REJECTED: "Declined", FAILED: "Not sent",
  AVAILABLE: "Available", PENDING: "Pending", PENDING_PAYMENT: "Waiting for material payment", PENDING_REVIEW: "Under review",
  PENDING_REAL_COST: "Waiting for final costs", PENDING_COST: "Waiting for final costs", REVERSED: "Reversed", HELD: "Under review",
}[value] ?? value.toLowerCase().replaceAll("_", " "));
export const referralModeLabel: Record<ReferralMode, string> = {
  EXTERNAL_MARGIN: "Difference from dealer price", CUSTOM_PERCENT: "Percentage of material margin", DEALER_PLAN: "Current dealer earnings plan",
};
export const referralRoleLabel: Record<ReferralRole, string> = {
  CLIENT: "Client", DISTRIBUTOR: "Distributor", SUBDEALER_INTERNAL: "Internal subdealer",
  SUBDEALER_EXTERNAL: "External subdealer", DEALER_EXTERNAL: "External dealer", DEALER_INTERNAL: "Internal dealer",
};
export function referralRuleLabel(rule?: { mode: ReferralMode | null; percent: ReferralMoney | null } | null) {
  if (!rule?.mode) return "—";
  return rule.mode === "CUSTOM_PERCENT" ? `${Number(rule.percent ?? 0)}% of material margin` : referralModeLabel[rule.mode];
}
// User-facing reward states deliberately exclude internal pricing and cost details.
export function referralRewardStatus(value: string) {
  return ({ AVAILABLE: "Available", PENDING: "Pending", PENDING_PAYMENT: "Waiting for material payment", REVERSED: "Reversed" } as Record<string, string>)[value] ?? "Under review";
}
export function moneyInCents(value: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, cents = ""] = value.trim().split(".");
  const amount = Number(whole) * 100 + Number(cents.padEnd(2, "0"));
  return Number.isSafeInteger(amount) ? amount : null;
}
export function validAchRoutingNumber(value: string) {
  if (!/^\d{9}$/.test(value) || /^0+$/.test(value)) return false;
  const digits = [...value].map(Number);
  return (3 * (digits[0] + digits[3] + digits[6]) + 7 * (digits[1] + digits[4] + digits[7]) + digits[2] + digits[5] + digits[8]) % 10 === 0;
}
