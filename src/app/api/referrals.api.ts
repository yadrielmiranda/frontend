import { apiFetch } from "./_base";
import type { ReferralAdminDashboard, ReferralAdminRoleDefaults, ReferralAdminUsers, ReferralBankInput, ReferralBankSummary, ReferralDashboard, ReferralMode, ReferralPayoutRecovery, ReferralPayoutTransition, ReferralProfileInput, ReferralRole } from "@/lib/referrals";

const root = "/api/referrals";
export const resolveReferral = (code: string) => apiFetch<{ valid: true; code?: string }>(`${root}/resolve/${encodeURIComponent(code)}`, { cache: "no-store", suppressAuthEvent: true });
export const getMyReferrals = (pages: { referralsPage: number; rewardsPage: number; payoutsPage: number }) => apiFetch<ReferralDashboard>(`${root}/me`, { query: pages, cache: "no-store" });
export const createReferralLink = () => apiFetch<{ code: string }>(`${root}/me/link`, { method: "POST" });
export const saveReferralBank = (data: ReferralBankInput) => apiFetch<ReferralBankSummary>(`${root}/me/bank`, { method: "PUT", body: data });
export const requestReferralPayout = (amount: string, requestKey: string) => apiFetch(`${root}/me/payouts`, { method: "POST", body: { amount, requestKey } });
export const cancelReferralPayout = (id: number) => apiFetch(`${root}/me/payouts/${id}/cancel`, { method: "POST" });
export const getReferralAdmin = (payoutsPage = 0, payoutStatus = "OPEN") => apiFetch<ReferralAdminDashboard>(`${root}/admin`, { query: { payoutsPage, payoutStatus }, cache: "no-store" });
export const getReferralRoleDefaults = () => apiFetch<ReferralAdminRoleDefaults>(`${root}/admin/role-defaults`, { cache: "no-store" });
export const getReferralUsers = (q = "", page = 0) => apiFetch<ReferralAdminUsers>(`${root}/admin/users`, { query: { q, page }, cache: "no-store" });
export const saveReferralProfile = (id: number, data: ReferralProfileInput) => apiFetch(`${root}/admin/users/${id}`, { method: "PATCH", body: data });
export const saveReferralRoleDefault = (role: ReferralRole, data: { mode: ReferralMode; percent?: string }) => apiFetch(`${root}/admin/role-defaults/${role}`, { method: "PATCH", body: data });
export const saveReferralSettings = (minimumWithdrawal: string) => apiFetch(`${root}/admin/settings`, { method: "PATCH", body: { minimumWithdrawal } });
export const revealPayoutBank = (id: number) => apiFetch<ReferralBankSummary & { routingNumber: string; accountNumber: string }>(`${root}/admin/payouts/${id}/bank`, { method: "POST", cache: "no-store" });
export const transitionReferralPayout = (id: number, data: ReferralPayoutTransition) => apiFetch(`${root}/admin/payouts/${id}/transition`, { method: "POST", body: data });
export const recoverReferralPayout = (id: number, data: ReferralPayoutRecovery) => apiFetch(`${root}/admin/payouts/${id}/recover`, { method: "POST", body: data });
